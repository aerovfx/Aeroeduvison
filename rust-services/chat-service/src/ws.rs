use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    pub room_id: String,
    pub user_id: String,
    pub user_name: Option<String>,
    pub content: String,
    pub message_type: String,
    pub timestamp: String,
}

pub type RoomChannels = Arc<RwLock<HashMap<String, broadcast::Sender<WsMessage>>>>;

pub fn new_room_channels() -> RoomChannels {
    Arc::new(RwLock::new(HashMap::new()))
}

pub async fn get_or_create_channel(
    channels: &RoomChannels,
    room_id: &str,
) -> broadcast::Sender<WsMessage> {
    let read = channels.read().await;
    if let Some(tx) = read.get(room_id) {
        return tx.clone();
    }
    drop(read);

    let mut write = channels.write().await;
    let (tx, _) = broadcast::channel(100);
    write.insert(room_id.to_string(), tx.clone());
    tx
}
