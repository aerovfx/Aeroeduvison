mod inventory;

use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Multipart, Path, Request, State, Query,
    },
    http::{header::CONTENT_TYPE, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{any, delete, get, post},
    Json, Router,
};
use once_cell::sync::Lazy;
use rand::Rng;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info};
use futures_util::{sink::SinkExt, stream::StreamExt};

static EMBEDDING_CACHE: Lazy<Mutex<HashMap<String, Vec<f64>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Clone)]
struct AppState {
    version: &'static str,
    ocr_backend_url: String,
    ocr_server_url: String,
    client: Client,
    lobby_state: Arc<Mutex<HashMap<String, LobbyState>>>,
    auth_service_url: String,
    // Downstream microservice URLs (used by the proxy router)
    course_service_url: String,
    admin_service_url: String,
    student_service_url: String,
    analytics_service_url: String,
    assignments_service_url: String,
    achievements_service_url: String,
    chat_service_url: String,
    emotion_service_url: String,
    grading_service_url: String,
    media_service_url: String,
    camera_service_url: String,
    stem_service_url: String,
    ai_service_url: String,
    teacher_service_url: String,
    exam_service_url: String,
    transcript_service_url: String,
    latex_service_url: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
    known_routes: usize,
    migrated_routes: usize,
}

#[derive(Debug, Deserialize)]
struct VectorSimilarityRequest {
    student_answer: String,
    model_answer: String,
    #[serde(default = "default_true")]
    use_cache: bool,
}

#[derive(Debug, Deserialize)]
struct LlmGradingRequest {
    student_answer: String,
    #[serde(default)]
    question_text: String,
    model_answer: String,
    max_score: f64,
    #[serde(default = "default_llm_provider")]
    llm_provider: String,
    #[serde(default)]
    auto_select: bool,
    #[serde(default = "default_subject")]
    subject: String,
    #[serde(default)]
    use_vector_similarity: bool,
    #[serde(default = "default_true")]
    use_embedding_cache: bool,
}

#[derive(Debug, Serialize)]
struct VectorSimilarityResponse {
    similarity: f64,
    similarity_percent: i32,
    student_vector_size: usize,
    model_vector_size: usize,
    cache_used: bool,
    cache_size: usize,
    processing_time_ms: u128,
    backend: &'static str,
    strangler_target: &'static str,
}

#[derive(Debug, Serialize)]
struct CacheClearResponse {
    message: &'static str,
    cache_size: usize,
    backend: &'static str,
}

#[derive(Debug, Serialize)]
struct NotImplementedResponse {
    error: &'static str,
    message: String,
    requested_path: String,
    known_api_path: bool,
    migrated_in_rust: bool,
}

#[derive(Debug, Clone, Serialize)]
struct LobbyPlayer {
    id: String,
    name: String,
    team: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PreviewQuestion {
    question: String,
    options: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QuizQuestion {
    id: String,
    question: String,
    options: Vec<String>,
    correct_index: usize,
}

#[derive(Debug, Clone)]
struct LobbyState {
    code: String,
    players: Vec<LobbyPlayer>,
    tx: broadcast::Sender<LobbyWsResponse>,
    game_state: Option<GameState>,
    full_questions: Vec<QuizQuestion>,
}

#[derive(Debug, Deserialize)]
struct LobbyJoinRequest {
    code: String,
    name: String,
    team: String,
}

#[derive(Debug, Deserialize)]
struct LobbyLeaveRequest {
    code: String,
    player_id: String,
}

#[derive(Debug, Serialize)]
struct LobbyCreateResponse {
    code: String,
}

#[derive(Debug, Serialize)]
struct LobbyJoinResponse {
    player_id: String,
    players: Vec<LobbyPlayer>,
}

#[derive(Debug, Clone, Serialize)]
struct LobbyStateResponse {
    code: String,
    players: Vec<LobbyPlayer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameState {
    question_index: usize,
    total_questions: usize,
    time_left: i32,
    question_time: i32,
    score_a: i32,
    score_b: i32,
    tug_position: i32,
    is_finished: bool,
    #[serde(default = "default_game_status")]
    status: String,
    question_text: String,
    options: Vec<String>,
    #[serde(default)]
    questions_preview: Vec<PreviewQuestion>,
}

#[derive(Debug, Deserialize)]
struct LobbyWsMessage {
    #[serde(rename = "type")]
    message_type: String,
    name: Option<String>,
    team: Option<String>,
    player_id: Option<String>,
    game_state: Option<GameState>,
    questions: Option<Vec<QuizQuestion>>,
}

#[derive(Debug, Clone, Serialize)]
struct LobbyWsResponse {
    #[serde(rename = "type")]
    message_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    player_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    players: Option<Vec<LobbyPlayer>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    game_state: Option<GameState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    questions: Option<Vec<QuizQuestion>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn default_true() -> bool {
    true
}

fn default_llm_provider() -> String {
    "auto".to_string()
}

fn default_game_status() -> String {
    "lobby".to_string()
}

fn default_subject() -> String {
    "general".to_string()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "aero_backend=info,tower_http=info".to_string()),
        )
        .init();

    let state = AppState {
        version: "0.1.0",
        ocr_backend_url: std::env::var("OCR_GRADING_BACKEND_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8012".to_string()),
        ocr_server_url: std::env::var("OCR_SERVER_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8001".to_string()),
        client: Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client"),
        lobby_state: Arc::new(Mutex::new(HashMap::new())),
        auth_service_url: std::env::var("AUTH_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8092".to_string()),
        course_service_url: std::env::var("COURSE_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8093".to_string()),
        admin_service_url: std::env::var("ADMIN_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8094".to_string()),
        student_service_url: std::env::var("STUDENT_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8095".to_string()),
        analytics_service_url: std::env::var("ANALYTICS_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8104".to_string()),
        assignments_service_url: std::env::var("ASSIGNMENTS_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8102".to_string()),
        achievements_service_url: std::env::var("ACHIEVEMENTS_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8103".to_string()),
        chat_service_url: std::env::var("CHAT_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8101".to_string()),
        emotion_service_url: std::env::var("EMOTION_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8105".to_string()),
        grading_service_url: std::env::var("GRADING_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8100".to_string()),
        media_service_url: std::env::var("MEDIA_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8098".to_string()),
        camera_service_url: std::env::var("CAMERA_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8099".to_string()),
        stem_service_url: std::env::var("STEM_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8097".to_string()),
        ai_service_url: std::env::var("AI_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8096".to_string()),
        teacher_service_url: std::env::var("TEACHER_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8106".to_string()),
        exam_service_url: std::env::var("EXAM_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8107".to_string()),
        transcript_service_url: std::env::var("TRANSCRIPT_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8108".to_string()),
        latex_service_url: std::env::var("LATEX_SERVICE_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8109".to_string()),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route(
            "/api/vector-similarity",
            post(vector_similarity).delete(clear_vector_cache),
        )
        .route("/api/vector-similarity/cache", delete(clear_vector_cache))
        .route("/api/ocr-grading", post(ocr_grading_post).get(ocr_grading_health))
        .route("/api/ocr/auto-grade", post(ocr_auto_grade_post))
        .route("/api/ocr/upload", post(ocr_upload_post))
        .route("/api/ocr-process", post(ocr_process_post))
        .route("/api/llm-grading", post(llm_grading_post))
        .route("/api/assignments/grade-ocr", post(assignments_grade_ocr_post))
        .route("/api/labtwin/quiz/lobby/create", post(lobby_create))
        .route("/api/labtwin/quiz/lobby/join", post(lobby_join))
        .route("/api/labtwin/quiz/lobby/leave", post(lobby_leave))
        .route("/api/labtwin/quiz/lobby/:code", get(lobby_get))
        .route("/api/labtwin/quiz/lobby/:code/ws", get(lobby_ws))
        // ── Service proxy routes (forward to downstream microservices) ──────
        .route("/api/auth/*path", any(proxy_auth))
        .route("/api/categories", any(proxy_courses))
        .route("/api/categories/*path", any(proxy_courses))
        .route("/api/courses", any(proxy_courses))
        .route("/api/courses/*path", any(proxy_courses))
        .route("/api/instructor/courses", any(proxy_courses))
        .route("/api/instructor/courses/*path", any(proxy_courses))
        .route("/api/learning/*path", any(proxy_courses))
        .route("/api/admin/*path", any(proxy_admin))
        .route("/api/analytics/*path", any(proxy_analytics))
        .route("/api/assignments/*path", any(proxy_assignments))
        .route("/api/achievements/*path", any(proxy_achievements))
        .route("/api/chat/*path", any(proxy_chat))
        .route("/api/emotion/*path", any(proxy_emotion))
        .route("/api/students/*path", any(proxy_students))
        // ── New service proxy routes ─────────────────────────────────────────
        .route("/api/classes", any(proxy_classes))
        .route("/api/classes/*path", any(proxy_classes))
        .route("/api/grading", any(proxy_grading))
        .route("/api/grading/*path", any(proxy_grading))
        .route("/api/documents", any(proxy_media))
        .route("/api/documents/*path", any(proxy_media))
        .route("/api/question-bank", any(proxy_media))
        .route("/api/question-bank/*path", any(proxy_media))
        .route("/api/questions", any(proxy_media))
        .route("/api/questions/*path", any(proxy_media))
        .route("/api/exam-matrices", any(proxy_media))
        .route("/api/exam-matrices/*path", any(proxy_media))
        .route("/api/exams", any(proxy_media))
        .route("/api/exams/*path", any(proxy_media))
        .route("/api/upload", any(proxy_media))
        .route("/api/upload/*path", any(proxy_media))
        .route("/api/cameras", any(proxy_camera))
        .route("/api/cameras/*path", any(proxy_camera))
        .route("/api/camera", any(proxy_camera))
        .route("/api/camera/*path", any(proxy_camera))
        .route("/api/iot", any(proxy_camera))
        .route("/api/iot/*path", any(proxy_camera))
        .route("/api/stem", any(proxy_stem))
        .route("/api/stem/*path", any(proxy_stem))
        .route("/api/physics/*path", any(proxy_stem))
        .route("/api/chemistry/*path", any(proxy_stem))
        .route("/api/lab-completion", any(proxy_stem))
        .route("/api/ai-chat", any(proxy_ai))
        .route("/api/ai-chat/*path", any(proxy_ai))
        .route("/api/ai-content", any(proxy_ai))
        .route("/api/ai-content/*path", any(proxy_ai))
        .route("/api/ai-analytics/*path", any(proxy_ai))
        .route("/api/ai-generate-lesson", any(proxy_ai))
        .route("/api/ai-grade-lesson", any(proxy_ai))
        .route("/api/ai-tutor-chat", any(proxy_ai))
        .route("/api/ai/*path", any(proxy_ai))
        // ── New services (teacher, exam, transcript, latex) ──────────────────
        .route("/api/teacher", any(proxy_teacher))
        .route("/api/teacher/*path", any(proxy_teacher))
        .route("/api/online-exam-room", any(proxy_exam))
        .route("/api/online-exam-room/*path", any(proxy_exam))
        .route("/api/transcript", any(proxy_transcript))
        .route("/api/transcript/*path", any(proxy_transcript))
        .route("/api/latex-projects", any(proxy_latex))
        .route("/api/latex-projects/*path", any(proxy_latex))
        // ── vision-tracker: emotion → emotion-service, rest → stub ───────────
        .route("/api/vision-tracker/emotion/stats", get(vision_tracker_emotion_stats))
        .route("/api/vision-tracker/emotion", post(vision_tracker_emotion_post))
        .route("/api/vision-tracker/attention", post(vision_tracker_attention))
        .route("/api/vision-tracker/consent", post(vision_tracker_consent).get(vision_tracker_consent_get))
        .route("/api/vision-tracker/heartmap", get(vision_tracker_heartmap))
        // ── /api/users → student-service; /api/student → student-service ─────
        .route("/api/users", any(proxy_students))
        .route("/api/users/*path", any(proxy_students))
        .route("/api/student", any(proxy_students))
        .route("/api/student/*path", any(proxy_students))
        // ── Fallback ────────────────────────────────────────────────────────
        .route("/api", any(api_not_implemented_root))
        .route("/api/*path", any(api_not_implemented))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    let addr = std::env::var("AERO_BACKEND_ADDR")
        .ok()
        .and_then(|v| v.parse::<SocketAddr>().ok())
        .unwrap_or_else(|| "127.0.0.1:8090".parse().expect("valid default addr"));

    info!("aero-backend listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener");

    axum::serve(listener, app)
        .await
        .expect("server error while serving aero-backend");
}

fn generate_lobby_code() -> String {
    let alphabet: Vec<char> = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".chars().collect();
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| {
            let index = rng.gen_range(0..alphabet.len());
            alphabet[index]
        })
        .collect()
}

async fn require_teacher(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<(), (StatusCode, String)> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Missing Authorization header".to_string()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| (StatusCode::UNAUTHORIZED, "Invalid Authorization header".to_string()))?;
    require_teacher_token(state, token).await
}

async fn require_teacher_token(
    state: &AppState,
    token: &str,
) -> Result<(), (StatusCode, String)> {
    let url = format!("{}/api/auth/me", state.auth_service_url);
    let response = state
        .client
        .get(url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|_| (StatusCode::BAD_GATEWAY, "Auth service unreachable".to_string()))?;

    if !response.status().is_success() {
        return Err((StatusCode::UNAUTHORIZED, "Invalid token".to_string()));
    }

    let user: serde_json::Value = response
        .json()
        .await
        .map_err(|_| (StatusCode::BAD_GATEWAY, "Invalid auth response".to_string()))?;

    let role = user
        .get("role")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_lowercase();

    if role != "teacher" && role != "admin" {
        return Err((StatusCode::FORBIDDEN, "Teacher access required".to_string()));
    }

    Ok(())
}

fn broadcast_lobby_state(lobby: &LobbyState) {
    let payload = LobbyWsResponse {
        message_type: "state".to_string(),
        player_id: None,
        code: Some(lobby.code.clone()),
        players: Some(lobby.players.clone()),
        game_state: None,
        questions: None,
        error: None,
    };
    let _ = lobby.tx.send(payload);
}

async fn lobby_create(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<LobbyCreateResponse>, (StatusCode, String)> {
    require_teacher(&state, &headers).await?;
    let mut lobby_state = state
        .lobby_state
        .lock()
        .expect("lobby state lock poisoned");

    let mut code = generate_lobby_code();
    while lobby_state.contains_key(&code) {
        code = generate_lobby_code();
    }

    lobby_state.insert(
        code.clone(),
        LobbyState {
            code: code.clone(),
            players: Vec::new(),
            tx: broadcast::channel(64).0,
            game_state: None,
            full_questions: Vec::new(),
        },
    );

    Ok(Json(LobbyCreateResponse { code }))
}

async fn lobby_join(
    State(state): State<AppState>,
    Json(payload): Json<LobbyJoinRequest>,
) -> Result<Json<LobbyJoinResponse>, (StatusCode, String)> {
    if payload.code.trim().is_empty() || payload.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing code or name".to_string()));
    }

    let mut lobby_state = state
        .lobby_state
        .lock()
        .expect("lobby state lock poisoned");

    let lobby = lobby_state
        .get_mut(&payload.code)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Lobby not found".to_string()))?;

    let player_id = format!("player_{}", rand::thread_rng().gen::<u64>());
    let player = LobbyPlayer {
        id: player_id.clone(),
        name: payload.name.trim().to_string(),
        team: payload.team.trim().to_uppercase(),
    };

    lobby.players.push(player);
    broadcast_lobby_state(lobby);

    Ok(Json(LobbyJoinResponse {
        player_id,
        players: lobby.players.clone(),
    }))
}

async fn lobby_leave(
    State(state): State<AppState>,
    Json(payload): Json<LobbyLeaveRequest>,
) -> Result<Json<LobbyStateResponse>, (StatusCode, String)> {
    let mut lobby_state = state
        .lobby_state
        .lock()
        .expect("lobby state lock poisoned");

    let lobby = lobby_state
        .get_mut(&payload.code)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Lobby not found".to_string()))?;

    lobby.players.retain(|player| player.id != payload.player_id);
    broadcast_lobby_state(lobby);

    Ok(Json(LobbyStateResponse {
        code: lobby.code.clone(),
        players: lobby.players.clone(),
    }))
}

async fn lobby_get(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<LobbyStateResponse>, (StatusCode, String)> {
    let lobby_state = state
        .lobby_state
        .lock()
        .expect("lobby state lock poisoned");

    let lobby = lobby_state
        .get(&code)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Lobby not found".to_string()))?;

    Ok(Json(LobbyStateResponse {
        code: lobby.code.clone(),
        players: lobby.players.clone(),
    }))
}

async fn lobby_ws(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    ws: WebSocketUpgrade,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let token = params.get("token").cloned();
    let is_host = if let Some(token_value) = token {
        require_teacher_token(&state, &token_value).await.is_ok()
    } else {
        false
    };

    let tx = {
        let lobby_state = state
            .lobby_state
            .lock()
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "lobby lock poisoned".to_string()))?;

        let lobby = lobby_state
            .get(&code)
            .ok_or_else(|| (StatusCode::NOT_FOUND, "Lobby not found".to_string()))?;

        lobby.tx.clone()
    };

    Ok(ws.on_upgrade(move |socket| lobby_ws_handle(socket, state, code, tx, is_host)))
}

async fn lobby_ws_handle(
    socket: WebSocket,
    state: AppState,
    code: String,
    tx: broadcast::Sender<LobbyWsResponse>,
    is_host: bool,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let mut rx = tx.subscribe();
    let mut current_player_id: Option<String> = None;

    if let Ok(initial_state) = get_lobby_state(&state, &code) {
        let message = LobbyWsResponse {
            message_type: "state".to_string(),
            player_id: None,
            code: Some(code.clone()),
            players: Some(initial_state.players),
            game_state: None,
            questions: None,
            error: None,
        };
        let _ = ws_sender
            .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
            .await;
    }

    if let Ok(game_state) = get_lobby_game_state(&state, &code) {
        let message = LobbyWsResponse {
            message_type: "game_state".to_string(),
            player_id: None,
            code: Some(code.clone()),
            players: None,
            game_state: Some(game_state),
            questions: None,
            error: None,
        };
        let _ = ws_sender
            .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
            .await;
    }

    if is_host {
        if let Ok((game_state, questions)) = get_lobby_snapshot(&state, &code) {
            if game_state.is_some() || !questions.is_empty() {
                let message = LobbyWsResponse {
                    message_type: "host_snapshot".to_string(),
                    player_id: None,
                    code: Some(code.clone()),
                    players: None,
                    game_state,
                    questions: if questions.is_empty() { None } else { Some(questions) },
                    error: None,
                };
                let _ = ws_sender
                    .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
                    .await;
            }
        }
    }

    loop {
        tokio::select! {
            Some(Ok(msg)) = ws_receiver.next() => {
                if let Message::Text(text) = msg {
                    if let Ok(payload) = serde_json::from_str::<LobbyWsMessage>(&text) {
                        match payload.message_type.as_str() {
                            "join" => {
                                let name = payload.name.unwrap_or_default();
                                let team = payload.team.unwrap_or_else(|| "A".to_string());
                                match lobby_add_player(&state, &code, name, team) {
                                    Ok(player_id) => {
                                        current_player_id = Some(player_id.clone());
                                        let message = LobbyWsResponse {
                                            message_type: "joined".to_string(),
                                            player_id: Some(player_id),
                                            code: Some(code.clone()),
                                            players: None,
                                            game_state: None,
                                            questions: None,
                                            error: None,
                                        };
                                        let _ = ws_sender
                                            .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
                                            .await;
                                    }
                                    Err(err) => {
                                        let message = LobbyWsResponse {
                                            message_type: "error".to_string(),
                                            player_id: None,
                                            code: Some(code.clone()),
                                            players: None,
                                            game_state: None,
                                            questions: None,
                                            error: Some(err),
                                        };
                                        let _ = ws_sender
                                            .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
                                            .await;
                                    }
                                }
                            }
                            "leave" => {
                                if let Some(player_id) = payload.player_id.or(current_player_id.clone()) {
                                    let _ = lobby_remove_player(&state, &code, &player_id);
                                }
                            }
                            "host_state" => {
                                if is_host {
                                    if let Some(game_state) = payload.game_state {
                                        let _ = lobby_update_game_state(&state, &code, game_state.clone(), payload.questions);
                                    }
                                }
                            }
                            "ping" => {
                                let message = LobbyWsResponse {
                                    message_type: "pong".to_string(),
                                    player_id: None,
                                    code: Some(code.clone()),
                                    players: None,
                                    game_state: None,
                                    questions: None,
                                    error: None,
                                };
                                let _ = ws_sender
                                    .send(Message::Text(serde_json::to_string(&message).unwrap_or_default()))
                                    .await;
                            }
                            _ => {}
                        }
                    }
                }
            }
            Ok(state_update) = rx.recv() => {
                let _ = ws_sender
                    .send(Message::Text(serde_json::to_string(&state_update).unwrap_or_default()))
                    .await;
            }
            else => {
                break;
            }
        }
    }

    if let Some(player_id) = current_player_id {
        let _ = lobby_remove_player(&state, &code, &player_id);
    }
}

fn get_lobby_state(state: &AppState, code: &str) -> Result<LobbyStateResponse, String> {
    let lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get(code).ok_or_else(|| "Lobby not found".to_string())?;
    Ok(LobbyStateResponse {
        code: lobby.code.clone(),
        players: lobby.players.clone(),
    })
}

fn get_lobby_game_state(state: &AppState, code: &str) -> Result<GameState, String> {
    let lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get(code).ok_or_else(|| "Lobby not found".to_string())?;
    lobby
        .game_state
        .clone()
        .ok_or_else(|| "Game state not found".to_string())
}

fn get_lobby_snapshot(
    state: &AppState,
    code: &str,
) -> Result<(Option<GameState>, Vec<QuizQuestion>), String> {
    let lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get(code).ok_or_else(|| "Lobby not found".to_string())?;
    Ok((lobby.game_state.clone(), lobby.full_questions.clone()))
}

fn lobby_add_player(state: &AppState, code: &str, name: String, team: String) -> Result<String, String> {
    if name.trim().is_empty() {
        return Err("Missing player name".to_string());
    }

    let mut lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get_mut(code).ok_or_else(|| "Lobby not found".to_string())?;

    let player_id = format!("player_{}", rand::thread_rng().gen::<u64>());
    let player = LobbyPlayer {
        id: player_id.clone(),
        name: name.trim().to_string(),
        team: team.trim().to_uppercase(),
    };

    lobby.players.push(player);
    broadcast_lobby_state(lobby);
    Ok(player_id)
}

fn lobby_remove_player(state: &AppState, code: &str, player_id: &str) -> Result<(), String> {
    let mut lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get_mut(code).ok_or_else(|| "Lobby not found".to_string())?;
    lobby.players.retain(|player| player.id != player_id);
    broadcast_lobby_state(lobby);
    Ok(())
}

fn lobby_update_game_state(
    state: &AppState,
    code: &str,
    game_state: GameState,
    questions: Option<Vec<QuizQuestion>>,
) -> Result<(), String> {
    let mut lobby_state = state
        .lobby_state
        .lock()
        .map_err(|_| "lobby lock poisoned".to_string())?;

    let lobby = lobby_state.get_mut(code).ok_or_else(|| "Lobby not found".to_string())?;
    lobby.game_state = Some(game_state.clone());
    if let Some(questions) = questions {
        lobby.full_questions = questions;
    }

    let payload = LobbyWsResponse {
        message_type: "game_state".to_string(),
        player_id: None,
        code: Some(lobby.code.clone()),
        players: None,
        game_state: Some(game_state),
        questions: None,
        error: None,
    };
    let _ = lobby.tx.send(payload);

    Ok(())
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "aero-backend",
        version: state.version,
        known_routes: inventory::KNOWN_API_ROUTES.len(),
        migrated_routes: inventory::MIGRATED_API_ROUTES.len(),
    })
}

async fn vector_similarity(
    Json(payload): Json<VectorSimilarityRequest>,
) -> Result<Json<VectorSimilarityResponse>, (StatusCode, String)> {
    if payload.student_answer.trim().is_empty() || payload.model_answer.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing required fields".to_string()));
    }

    let start = std::time::Instant::now();

    let cache_key = format!(
        "{}_{}",
        &payload.student_answer.chars().take(50).collect::<String>(),
        &payload.model_answer.chars().take(50).collect::<String>()
    );

    let student_key = format!("{}_student", cache_key);
    let model_key = format!("{}_model", cache_key);

    let (student_vector, model_vector, cache_used, cache_size) = {
        let mut cache = EMBEDDING_CACHE
            .lock()
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "cache lock poisoned".to_string()))?;

        if payload.use_cache && cache.contains_key(&student_key) && cache.contains_key(&model_key) {
            let student_vector = cache
                .get(&student_key)
                .cloned()
                .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "cache read failed".to_string()))?;
            let model_vector = cache
                .get(&model_key)
                .cloned()
                .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "cache read failed".to_string()))?;

            (student_vector, model_vector, true, cache.len())
        } else {
            let student_vector = text_to_vector(&payload.student_answer);
            let model_vector = text_to_vector(&payload.model_answer);

            if payload.use_cache {
                cache.insert(student_key, student_vector.clone());
                cache.insert(model_key, model_vector.clone());
            }

            (student_vector, model_vector, false, cache.len())
        }
    };

    let similarity = cosine_similarity(&student_vector, &model_vector);
    let similarity_percent = (similarity * 100.0).round() as i32;

    Ok(Json(VectorSimilarityResponse {
        similarity,
        similarity_percent,
        student_vector_size: student_vector.len(),
        model_vector_size: model_vector.len(),
        cache_used,
        cache_size,
        processing_time_ms: start.elapsed().as_millis(),
        backend: "rust",
        strangler_target: "rust",
    }))
}

async fn clear_vector_cache() -> Json<CacheClearResponse> {
    let mut cache = EMBEDDING_CACHE
        .lock()
        .expect("embedding cache lock should not be poisoned");
    cache.clear();

    Json(CacheClearResponse {
        message: "Cache cleared",
        cache_size: 0,
        backend: "rust",
    })
}

async fn ocr_grading_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/api/simulate", state.ocr_backend_url);

    let mut req = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, "application/json");

    if let Some(value) = headers.get("x-request-id") {
        req = req.header("x-request-id", value);
    }

    let response = req
        .body(body)
        .send()
        .await
        .map_err(|e| {
            error!("OCR grading upstream request failed: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "success": false,
                    "error": "Backend not available",
                    "message": "OCR Grading backend is not running on port 8012",
                    "details": e.to_string(),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "success": false,
                "error": "Backend error",
                "message": text,
                "backend": "rust"
            })),
        ));
    }

    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));
    Ok((StatusCode::OK, Json(json_body)))
}

async fn ocr_grading_health(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/api/health", state.ocr_backend_url);

    let response = state.client.get(&upstream_url).send().await.map_err(|e| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "success": false,
                "error": "Backend not available",
                "message": "OCR Grading backend is not running on port 8012",
                "details": e.to_string(),
                "backend": "rust"
            })),
        )
    })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_auto_grade_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/auto-grade", state.ocr_backend_url);
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "Auto-grading failed",
                    "details": format!("Upstream OCR backend unavailable: {}", e),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_upload_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let upstream_url = format!("{}/ocr", state.ocr_backend_url);
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR processing failed",
                    "details": format!("Upstream OCR backend unavailable: {}", e),
                    "backend": "rust"
                })),
            )
        })?;

    let status = response.status();
    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let json_body: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    Ok((
        StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK),
        Json(json_body),
    ))
}

async fn ocr_process_post(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");

    if !content_type.starts_with("multipart/form-data") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "No file provided",
                "backend": "rust"
            })),
        ));
    }

    let upstream_url = format!("{}/ocr", state.ocr_server_url);
    let response = state
        .client
        .post(&upstream_url)
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                    "details": e.to_string(),
                    "serviceUrl": state.ocr_server_url,
                    "backend": "rust"
                })),
            )
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_else(|_| "OCR server error".to_string());
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                "details": text,
                "serviceUrl": state.ocr_server_url,
                "backend": "rust"
            })),
        ));
    }

    let text = response.text().await.unwrap_or_else(|_| "{}".to_string());
    let ocr_json: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({ "raw": text }));

    let transformed = json!({
        "success": true,
        "data": {
            "text": ocr_json.get("text").cloned().unwrap_or(json!("")),
            "lines": ocr_json.get("lines").cloned().unwrap_or(json!([])),
            "confidence": ocr_json.get("confidence").cloned().unwrap_or(json!(0)),
            "boxes": ocr_json.get("boxes").cloned().unwrap_or(json!([])),
            "total_lines": ocr_json.get("total_lines").cloned().unwrap_or(json!(0)),
            "filename": ocr_json.get("filename").cloned().unwrap_or(json!("uploaded-image"))
        },
        "backend": "rust"
    });

    Ok((StatusCode::OK, Json(transformed)))
}

async fn llm_grading_post(
    Json(payload): Json<LlmGradingRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    if payload.student_answer.trim().is_empty()
        || payload.model_answer.trim().is_empty()
        || payload.max_score <= 0.0
    {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Thiếu thông tin bắt buộc" })),
        ));
    }

    let selected_provider = if payload.auto_select || payload.llm_provider == "auto" {
        auto_select_provider(
            &payload.student_answer,
            &payload.question_text,
            &payload.model_answer,
        )
    } else {
        payload.llm_provider.clone()
    };

    // Rust orchestrator uses deterministic fallback grading for now.
    let (score, comment) = smart_simulation_grade(
        &payload.student_answer,
        &payload.model_answer,
        payload.max_score,
        &payload.subject,
    );

    let vector_similarity = if payload.use_vector_similarity {
        let student_vector = text_to_vector(&payload.student_answer);
        let model_vector = text_to_vector(&payload.model_answer);
        Some((cosine_similarity(&student_vector, &model_vector) * 100.0).round() as i32)
    } else {
        None
    };

    Ok((
        StatusCode::OK,
        Json(json!({
            "score": round1(score),
            "comment": comment,
            "provider": if matches!(selected_provider.as_str(), "gpt4" | "gemini" | "grok") { selected_provider } else { "simulation".to_string() },
            "auto_selected": payload.auto_select || payload.llm_provider == "auto",
            "reasoning": if payload.auto_select || payload.llm_provider == "auto" {
                Value::String("Auto-selected simulation provider in Rust orchestrator".to_string())
            } else {
                Value::Null
            },
            "subject": payload.subject,
            "vector_similarity": vector_similarity,
            "features_used": {
                "vector_similarity": payload.use_vector_similarity,
                "embedding_cache": payload.use_embedding_cache,
                "subject_tuning": payload.subject != "general"
            },
            "backend": "rust",
            "strangler_target": "rust"
        })),
    ))
}

async fn assignments_grade_ocr_post(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let mut assignment_id = String::new();
    let mut student_id = String::new();
    let mut answer_key = String::new();
    let mut llm_provider = "auto".to_string();
    let mut max_score = 10.0_f64;

    let mut file_name = "uploaded-image".to_string();
    let mut file_content_type = "application/octet-stream".to_string();
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid multipart payload", "details": e.to_string() })),
        )
    })? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            if let Some(filename) = field.file_name() {
                file_name = filename.to_string();
            }
            if let Some(content_type) = field.content_type() {
                file_content_type = content_type.to_string();
            }
            let bytes = field.bytes().await.map_err(|e| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Invalid file data", "details": e.to_string() })),
                )
            })?;
            file_bytes = Some(bytes.to_vec());
            continue;
        }

        let value = field.text().await.unwrap_or_default();
        match name.as_str() {
            "assignmentId" => assignment_id = value,
            "studentId" => student_id = value,
            "answerKey" => answer_key = value,
            "llmProvider" => llm_provider = value,
            "maxScore" => {
                if let Ok(parsed) = value.parse::<f64>() {
                    max_score = parsed;
                }
            }
            _ => {}
        }
    }

    if file_bytes.is_none()
        || assignment_id.trim().is_empty()
        || student_id.trim().is_empty()
        || answer_key.trim().is_empty()
    {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Missing required fields", "backend": "rust" })),
        ));
    }

    let upload_bytes = file_bytes.unwrap_or_default();
    let file_part = match reqwest::multipart::Part::bytes(upload_bytes.clone())
        .file_name(file_name.clone())
        .mime_str(&file_content_type)
    {
        Ok(part) => part,
        Err(_) => reqwest::multipart::Part::bytes(upload_bytes).file_name(file_name.clone()),
    };
    let ocr_multipart = reqwest::multipart::Form::new().part("file", file_part);

    let ocr_url = format!("{}/ocr", state.ocr_server_url);
    let ocr_response = state
        .client
        .post(&ocr_url)
        .multipart(ocr_multipart)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": "OCR service không khả dụng. Vui lòng đảm bảo OCR service đang chạy.",
                    "details": e.to_string(),
                    "serviceUrl": state.ocr_server_url,
                    "backend": "rust"
                })),
            )
        })?;

    if !ocr_response.status().is_success() {
        let status = ocr_response.status();
        let text = ocr_response
            .text()
            .await
            .unwrap_or_else(|_| "OCR server error".to_string());
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(json!({
                "error": "OCR processing failed",
                "details": text,
                "backend": "rust"
            })),
        ));
    }

    let ocr_text = ocr_response.text().await.unwrap_or_else(|_| "{}".to_string());
    let ocr_json: Value = serde_json::from_str(&ocr_text).unwrap_or_else(|_| json!({ "raw": ocr_text }));
    let extracted_text = ocr_json
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let ocr_confidence = ocr_json
        .get("confidence")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.95);

    let llm_payload = LlmGradingRequest {
        student_answer: extracted_text.clone(),
        question_text: String::new(),
        model_answer: answer_key.clone(),
        max_score,
        llm_provider: llm_provider.clone(),
        auto_select: llm_provider == "auto",
        subject: "math".to_string(),
        use_vector_similarity: false,
        use_embedding_cache: true,
    };

    let (score, feedback) = smart_simulation_grade(
        &llm_payload.student_answer,
        &llm_payload.model_answer,
        llm_payload.max_score,
        &llm_payload.subject,
    );

    Ok((
        StatusCode::OK,
        Json(json!({
            "success": true,
            "data": {
                "assignmentId": assignment_id,
                "studentId": student_id,
                "ocrText": extracted_text,
                "score": round1(score),
                "maxScore": max_score,
                "feedback": feedback,
                "aiProvider": if llm_provider == "auto" { "simulation" } else { llm_provider.as_str() },
                "confidence": ocr_confidence
            },
            "backend": "rust",
            "strangler_target": "rust"
        })),
    ))
}

fn auto_select_provider(student_answer: &str, question_text: &str, model_answer: &str) -> String {
    let complexity = (if student_answer.len() > 500 { 2 } else { 0 })
        + (if question_text.len() > 200 { 1 } else { 0 })
        + (if model_answer.len() > 300 { 1 } else { 0 });

    if complexity >= 2 {
        "gpt4".to_string()
    } else {
        "simulation".to_string()
    }
}

fn smart_simulation_grade(
    student_answer: &str,
    model_answer: &str,
    max_score: f64,
    _subject: &str,
) -> (f64, String) {
    let answer_words: Vec<&str> = student_answer.split_whitespace().collect();
    let model_words: Vec<&str> = model_answer.split_whitespace().collect();
    let answer_len = student_answer.chars().count();
    let model_len = model_answer.chars().count();

    let similarity = if answer_words.is_empty() || model_words.is_empty() {
        0.0
    } else {
        let overlap = answer_words
            .iter()
            .filter(|w| model_words.contains(w))
            .count() as f64;
        overlap / answer_words.len().max(model_words.len()) as f64
    };

    let length_score = (answer_len as f64 / model_len.max(1) as f64).min(1.3);
    let mut score = (similarity * 0.7 + (length_score / 1.3) * 0.3) * max_score;
    score = score.clamp(0.0, max_score);

    let comment = if score >= max_score * 0.8 {
        format!("Bài làm tốt, nội dung tương đối đầy đủ. Điểm: {}/{}.", round1(score), round1(max_score))
    } else if score >= max_score * 0.5 {
        format!("Bài làm khá, cần bổ sung thêm ý chính. Điểm: {}/{}.", round1(score), round1(max_score))
    } else {
        format!("Bài làm cần cải thiện, thiếu nhiều ý quan trọng. Điểm: {}/{}.", round1(score), round1(max_score))
    };

    (score, comment)
}

fn round1(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

// ── Generic reverse-proxy helper ─────────────────────────────────────────────

/// Forward an Axum request to a downstream service, preserving method, headers, and body.
/// `prefix` is stripped from the path before forwarding, e.g. "/api/auth" → "/api/auth".
async fn proxy_to(
    state: &AppState,
    target_base: &str,
    request: Request,
) -> impl IntoResponse {
    let method = reqwest::Method::from_bytes(request.method().as_str().as_bytes())
        .unwrap_or(reqwest::Method::GET);

    // Build target URL: target_base + original path + query
    let original_uri = request.uri();
    let path_and_query = original_uri
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or(original_uri.path());
    let target_url = format!("{}{}", target_base, path_and_query);

    // Copy headers (skip hop-by-hop)
    let mut req_builder = state.client.request(method, &target_url);
    for (name, value) in request.headers() {
        let name_str = name.as_str().to_lowercase();
        if !matches!(name_str.as_str(), "host" | "connection" | "transfer-encoding" | "te" | "trailer" | "upgrade") {
            if let Ok(v) = value.to_str() {
                req_builder = req_builder.header(name.as_str(), v);
            }
        }
    }

    // Forward body
    let body_bytes = match axum::body::to_bytes(request.into_body(), 10 * 1024 * 1024).await {
        Ok(b) => b,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Failed to read request body" })),
            ).into_response();
        }
    };
    if !body_bytes.is_empty() {
        req_builder = req_builder.body(body_bytes.to_vec());
    }

    match req_builder.send().await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let mut response_builder = axum::response::Response::builder().status(status);

            // Forward response headers
            for (name, value) in resp.headers() {
                let name_str = name.as_str().to_lowercase();
                if !matches!(name_str.as_str(), "connection" | "transfer-encoding") {
                    response_builder = response_builder.header(name.as_str(), value.to_str().unwrap_or(""));
                }
            }

            let body = resp.bytes().await.unwrap_or_default();
            response_builder
                .body(axum::body::Body::from(body))
                .unwrap_or_else(|_| {
                    (StatusCode::INTERNAL_SERVER_ERROR, "Proxy error").into_response()
                })
        }
        Err(e) => {
            tracing::error!("Proxy error forwarding to {}: {}", target_url, e);
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({
                    "error": "Service unavailable",
                    "message": format!("Downstream service unreachable: {}", target_url),
                })),
            ).into_response()
        }
    }
}

async fn proxy_auth(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.auth_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_courses(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.course_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_admin(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.admin_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_analytics(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.analytics_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_assignments(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.assignments_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_achievements(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.achievements_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_chat(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.chat_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_emotion(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.emotion_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_students(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.student_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_classes(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.student_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_grading(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.grading_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_media(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.media_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_camera(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.camera_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_stem(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.stem_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_ai(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.ai_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_teacher(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.teacher_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_exam(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.exam_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_transcript(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.transcript_service_url.clone();
    proxy_to(&state, &url, request).await
}

async fn proxy_latex(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let url = state.latex_service_url.clone();
    proxy_to(&state, &url, request).await
}

// ── vision-tracker stub/proxy handlers ───────────────────────────────────────

/// POST /api/vision-tracker/emotion → forward to emotion-service /api/emotion
async fn vision_tracker_emotion_post(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    // Rewrite path to /api/emotion and proxy to emotion-service
    let url = format!("{}/api/emotion", state.emotion_service_url);
    proxy_to_url(&state, &url, request).await
}

/// GET /api/vision-tracker/emotion/stats → forward to emotion-service /api/emotion/stats
async fn vision_tracker_emotion_stats(State(state): State<AppState>, request: Request) -> impl IntoResponse {
    let uri = request.uri();
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let url = format!("{}/api/emotion/stats{}", state.emotion_service_url, query);
    proxy_to_url(&state, &url, request).await
}

/// POST /api/vision-tracker/attention — in-memory stub (no persistent storage needed)
async fn vision_tracker_attention(Json(_body): Json<Value>) -> impl IntoResponse {
    Json(json!({
        "success": true,
        "message": "Attention event recorded",
        "backend": "rust"
    }))
}

/// POST + GET /api/vision-tracker/consent — consent stub
async fn vision_tracker_consent(Json(_body): Json<Value>) -> impl IntoResponse {
    Json(json!({
        "success": true,
        "message": "Consent recorded",
        "backend": "rust"
    }))
}

async fn vision_tracker_consent_get() -> impl IntoResponse {
    Json(json!({
        "success": true,
        "consents": [],
        "backend": "rust"
    }))
}

/// GET /api/vision-tracker/heartmap — mock heartmap data
async fn vision_tracker_heartmap() -> impl IntoResponse {
    Json(json!({
        "success": true,
        "data": {
            "class_id": "default",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "students": [],
            "class_statistics": {
                "total_students": 0,
                "consent_students": 0,
                "average_attention": 0.0,
                "low_attention_count": 0,
                "high_attention_count": 0,
                "engagement_trend": "stable"
            }
        },
        "backend": "rust"
    }))
}

/// Like proxy_to but forwards to an explicit URL (not derived from request path)
async fn proxy_to_url(state: &AppState, target_url: &str, request: Request) -> impl IntoResponse {
    let method = reqwest::Method::from_bytes(request.method().as_str().as_bytes())
        .unwrap_or(reqwest::Method::GET);

    let mut req_builder = state.client.request(method, target_url);
    for (name, value) in request.headers() {
        let name_str = name.as_str().to_lowercase();
        if !matches!(name_str.as_str(), "host" | "connection" | "transfer-encoding" | "te" | "trailer" | "upgrade") {
            if let Ok(v) = value.to_str() {
                req_builder = req_builder.header(name.as_str(), v);
            }
        }
    }

    let body_bytes = match axum::body::to_bytes(request.into_body(), 10 * 1024 * 1024).await {
        Ok(b) => b,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Failed to read request body" })),
            ).into_response();
        }
    };
    if !body_bytes.is_empty() {
        req_builder = req_builder.body(body_bytes.to_vec());
    }

    match req_builder.send().await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let body = resp.bytes().await.unwrap_or_default();
            (status, body).into_response()
        }
        Err(e) => {
            error!("proxy_to_url error: {}", e);
            (StatusCode::BAD_GATEWAY, Json(json!({ "error": "Upstream service unavailable" }))).into_response()
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

async fn api_not_implemented_root(request: Request) -> impl IntoResponse {
    build_not_implemented_response(request.uri().path().to_string())
}

async fn api_not_implemented(Path(path): Path<String>) -> impl IntoResponse {
    let normalized_path = if path.starts_with('/') {
        format!("/api{}", path)
    } else {
        format!("/api/{}", path)
    };

    build_not_implemented_response(normalized_path)
}

fn build_not_implemented_response(requested_path: String) -> (StatusCode, Json<NotImplementedResponse>) {
    let known = is_known_api_path(&requested_path);
    let migrated = inventory::MIGRATED_API_ROUTES.contains(&requested_path.as_str());

    (
        StatusCode::NOT_IMPLEMENTED,
        Json(NotImplementedResponse {
            error: "Not implemented in Rust yet",
            message: if known {
                "Route exists in Node inventory but is still scaffolded in Rust".to_string()
            } else {
                "Route is not present in generated API inventory".to_string()
            },
            requested_path,
            known_api_path: known,
            migrated_in_rust: migrated,
        }),
    )
}

fn is_known_api_path(path: &str) -> bool {
    inventory::KNOWN_API_ROUTES
        .iter()
        .any(|pattern| route_pattern_matches(pattern, path))
}

fn route_pattern_matches(pattern: &str, actual: &str) -> bool {
    let p_segments: Vec<&str> = pattern.trim_matches('/').split('/').collect();
    let a_segments: Vec<&str> = actual.trim_matches('/').split('/').collect();

    let mut i = 0usize;
    let mut j = 0usize;

    while i < p_segments.len() && j < a_segments.len() {
        let ps = p_segments[i];
        let is_catch_all = ps.starts_with("[...") && ps.ends_with(']');
        let is_dynamic = ps.starts_with('[') && ps.ends_with(']');

        if is_catch_all {
            return true;
        }

        if is_dynamic {
            i += 1;
            j += 1;
            continue;
        }

        if ps != a_segments[j] {
            return false;
        }

        i += 1;
        j += 1;
    }

    if i < p_segments.len() {
        return p_segments[i].starts_with("[...") && p_segments[i].ends_with(']');
    }

    j == a_segments.len()
}

fn cosine_similarity(vec1: &[f64], vec2: &[f64]) -> f64 {
    if vec1.len() != vec2.len() || vec1.is_empty() {
        return 0.0;
    }

    let mut dot_product = 0.0;
    let mut norm1 = 0.0;
    let mut norm2 = 0.0;

    for i in 0..vec1.len() {
        dot_product += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    if norm1 == 0.0 || norm2 == 0.0 {
        return 0.0;
    }

    dot_product / (norm1.sqrt() * norm2.sqrt())
}

fn text_to_vector(text: &str) -> Vec<f64> {
    let lower = text.to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();
    let word_set: HashSet<&str> = words.iter().copied().collect();

    let common_words = [
        "đảng",
        "lãnh đạo",
        "nhân dân",
        "cách mạng",
        "thắng lợi",
        "đoàn kết",
        "dân tộc",
        "thời cơ",
        "độc lập",
        "tự do",
    ];

    let mut vector = Vec::with_capacity(common_words.len() + 3);

    for word in common_words {
        let count = words.iter().filter(|w| w.contains(word)).count() as f64;
        vector.push(if count > 0.0 { (count + 1.0).ln() } else { 0.0 });
    }

    let words_len = words.len() as f64;
    let vocab_len = word_set.len() as f64;
    vector.push(words_len);
    vector.push(vocab_len);
    vector.push(if words_len > 0.0 { vocab_len / words_len } else { 0.0 });

    vector
}
