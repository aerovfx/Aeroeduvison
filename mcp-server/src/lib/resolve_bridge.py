#!/usr/bin/env python3
"""
AeroEdu × DaVinci Resolve bridge
----------------------------------
Nhận JSON command từ stdin, thực thi qua Resolve Python API,
trả JSON result về stdout.

Yêu cầu:
  - DaVinci Resolve ĐANG MỞ (không cần project cụ thể)
  - Python ≥ 3.6 64-bit
  - Chạy với env vars đúng (tự set bên dưới nếu chưa có)

Commands accepted (JSON line trên stdin):
  {"action": "ping"}
  {"action": "get_info"}
  {"action": "project_open", "name": "MyProject"}
  {"action": "project_create", "name": "NewProject"}
  {"action": "clip_import", "file_path": "/abs/path/to/video.mp4", "bin_name": "MCP Import"}
  {"action": "color_apply_lut", "lut_path": "/path/to/lut.cube", "node_index": 1, "timeline_name": null}
  {"action": "timeline_export", "output_path": "/tmp/out.mp4", "format": "mp4", "codec": "H264", "preset": null, "timeline_name": null}
  {"action": "render_start", "wait": true}
  {"action": "render_status"}

Response (JSON line trên stdout):
  {"ok": true, ...}
  {"ok": false, "error": "message"}
"""

import sys
import os
import json
import time

# ── Setup Resolve scripting environment ──────────────────────────────────────
RESOLVE_API = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
RESOLVE_LIB = "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"

os.environ.setdefault("RESOLVE_SCRIPT_API", RESOLVE_API)
os.environ.setdefault("RESOLVE_SCRIPT_LIB", RESOLVE_LIB)

modules_path = os.path.join(RESOLVE_API, "Modules")
if modules_path not in sys.path:
    sys.path.insert(0, modules_path)

# ── Helper ───────────────────────────────────────────────────────────────────
def ok(**kwargs):
    return {"ok": True, **kwargs}

def err(msg):
    return {"ok": False, "error": str(msg)}

def get_resolve():
    try:
        import DaVinciResolveScript as dvr
        r = dvr.scriptapp("Resolve")
        if r is None:
            return None, "DaVinci Resolve không phản hồi. Hãy mở Resolve trước khi dùng tool này."
        return r, None
    except ImportError as e:
        return None, f"Không load được DaVinciResolveScript: {e}"
    except Exception as e:
        return None, f"Lỗi kết nối Resolve: {e}"

# ── Command handlers ─────────────────────────────────────────────────────────
def cmd_ping(_cmd):
    r, error = get_resolve()
    if error:
        return {"ok": False, "resolve_running": False, "error": error}
    info = r.GetProductInformation() or {}
    return ok(resolve_running=True, version=info.get("releaseVersion", "unknown"),
               product=info.get("product", "DaVinci Resolve"))


def cmd_get_info(_cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    timelines = []
    if project:
        for i in range(1, project.GetTimelineCount() + 1):
            tl = project.GetTimelineByIndex(i)
            timelines.append({"name": tl.GetName(), "fps": tl.GetSetting("timelineFrameRate")})
    return ok(
        product=r.GetProductInformation(),
        current_project=project.GetName() if project else None,
        timelines=timelines,
        current_page=r.GetCurrentPage(),
    )


def cmd_project_open(cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    name = cmd.get("name", "").strip()
    if not name:
        return err("Thiếu tên project (name)")
    pm = r.GetProjectManager()
    project = pm.LoadProject(name)
    if not project:
        return err(f"Không tìm thấy project '{name}'. Dùng project_create để tạo mới.")
    return ok(project_name=project.GetName(), timeline_count=project.GetTimelineCount())


def cmd_project_create(cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    name = cmd.get("name", "").strip()
    if not name:
        return err("Thiếu tên project (name)")
    pm = r.GetProjectManager()
    project = pm.CreateProject(name)
    if not project:
        return err(f"Không tạo được project '{name}'. Tên đã tồn tại hoặc Resolve báo lỗi.")
    return ok(project_name=project.GetName(), created=True)


def cmd_clip_import(cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    file_path = cmd.get("file_path", "").strip()
    if not file_path:
        return err("Thiếu file_path")
    if not os.path.isfile(file_path):
        return err(f"File không tồn tại: {file_path}")

    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        return err("Chưa có project nào được mở. Gọi project_open hoặc project_create trước.")

    mp = project.GetMediaPool()
    root_folder = mp.GetRootFolder()

    # Tạo bin riêng cho MCP import nếu chưa có
    bin_name = cmd.get("bin_name", "MCP Import")
    target_folder = None
    for sub in root_folder.GetSubFolderList():
        if sub.GetName() == bin_name:
            target_folder = sub
            break
    if not target_folder:
        target_folder = mp.AddSubFolder(root_folder, bin_name)

    mp.SetCurrentFolder(target_folder)
    clips = mp.ImportMedia([file_path])
    if not clips:
        return err(f"Import thất bại: {file_path}")

    clip_info = []
    for clip in clips:
        clip_info.append({
            "name": clip.GetName(),
            "duration": clip.GetClipProperty("Duration"),
            "fps": clip.GetClipProperty("FPS"),
            "resolution": f"{clip.GetClipProperty('Clip X')}x{clip.GetClipProperty('Clip Y')}",
        })

    return ok(imported_count=len(clips), clips=clip_info, bin=bin_name)


def cmd_color_apply_lut(cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    lut_path = cmd.get("lut_path", "").strip()
    if not lut_path:
        return err("Thiếu lut_path (đường dẫn file .cube hoặc .3dl)")
    if not os.path.isfile(lut_path):
        return err(f"LUT file không tồn tại: {lut_path}")

    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        return err("Chưa có project nào được mở.")

    timeline_name = cmd.get("timeline_name")
    if timeline_name:
        timeline = None
        for i in range(1, project.GetTimelineCount() + 1):
            tl = project.GetTimelineByIndex(i)
            if tl.GetName() == timeline_name:
                timeline = tl
                break
        if not timeline:
            return err(f"Không tìm thấy timeline '{timeline_name}'")
        project.SetCurrentTimeline(timeline)
    else:
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return err("Không có timeline hiện tại. Chỉ định timeline_name.")

    r.OpenPage("color")
    node_index = int(cmd.get("node_index", 1))
    track_count = timeline.GetTrackCount("video")
    applied = 0
    failed = 0

    for track_idx in range(1, track_count + 1):
        clips = timeline.GetItemListInTrack("video", track_idx)
        for clip in clips:
            try:
                success = clip.SetLUT(node_index, lut_path)
                if success:
                    applied += 1
                else:
                    failed += 1
            except Exception:
                failed += 1

    return ok(
        timeline=timeline.GetName(),
        lut=os.path.basename(lut_path),
        node_index=node_index,
        clips_applied=applied,
        clips_failed=failed,
    )


# Codec mapping cho common formats
CODEC_MAP = {
    "mp4": ("MP4", "H264"),
    "mov": ("QuickTime", "ProRes422HQ"),
    "prores": ("QuickTime", "ProRes422HQ"),
    "h264": ("MP4", "H264"),
    "h265": ("MP4", "H265"),
    "dnxhd": ("MXF OP-Atom", "DNxHD 185X"),
}

def cmd_timeline_export(cmd):
    r, error = get_resolve()
    if error:
        return err(error)

    output_path = cmd.get("output_path", "").strip()
    if not output_path:
        return err("Thiếu output_path")

    fmt = cmd.get("format", "mp4").lower()
    render_format, render_codec = CODEC_MAP.get(fmt, ("MP4", "H264"))
    # Allow override
    if cmd.get("codec"):
        render_codec = cmd["codec"]

    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        return err("Chưa có project nào được mở.")

    timeline_name = cmd.get("timeline_name")
    if timeline_name:
        timeline = None
        for i in range(1, project.GetTimelineCount() + 1):
            tl = project.GetTimelineByIndex(i)
            if tl.GetName() == timeline_name:
                timeline = tl
                break
        if not timeline:
            return err(f"Không tìm thấy timeline '{timeline_name}'")
        project.SetCurrentTimeline(timeline)
    else:
        timeline = project.GetCurrentTimeline()
        if not timeline:
            return err("Không có timeline hiện tại.")

    r.OpenPage("deliver")

    # Load preset nếu có
    preset = cmd.get("preset")
    if preset:
        project.LoadRenderPreset(preset)

    if not project.SetCurrentRenderFormatAndCodec(render_format, render_codec):
        return err(f"Format/Codec không hỗ trợ: {render_format}/{render_codec}")

    output_dir = os.path.dirname(output_path)
    output_name = os.path.splitext(os.path.basename(output_path))[0]
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    project.SetRenderSettings({
        "SelectAllFrames": 1,
        "TargetDir": output_dir or os.getcwd(),
        "CustomName": output_name,
    })

    job_id = project.AddRenderJob()
    if not job_id:
        return err("Không thêm được render job. Kiểm tra Resolve Deliver page.")

    return ok(
        timeline=timeline.GetName(),
        output_path=output_path,
        format=render_format,
        codec=render_codec,
        job_id=job_id,
        message="Render job đã được thêm. Dùng render_start để bắt đầu render.",
    )


def cmd_render_start(cmd):
    r, error = get_resolve()
    if error:
        return err(error)

    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        return err("Chưa có project nào được mở.")

    job_count = len(project.GetRenderJobList() or [])
    if job_count == 0:
        return err("Không có render job nào. Dùng timeline_export trước.")

    started = project.StartRendering()
    if not started:
        return err("Không bắt đầu được render. Kiểm tra Resolve Deliver page.")

    wait = cmd.get("wait", False)
    if wait:
        timeout = int(cmd.get("timeout_seconds", 600))
        elapsed = 0
        while project.IsRenderingInProgress() and elapsed < timeout:
            time.sleep(2)
            elapsed += 2
        if elapsed >= timeout:
            return err(f"Render timeout sau {timeout}s. Kiểm tra tiến trình trong Resolve.")

    jobs = project.GetRenderJobList() or []
    completed = [j for j in jobs if j.get("CompletionPercentage", 0) >= 100]
    return ok(
        render_started=True,
        job_count=job_count,
        wait=wait,
        completed_jobs=len(completed) if wait else None,
        message="Render đang chạy. Kiểm tra tiến trình trong Resolve Deliver page." if not wait
                else f"Render hoàn thành {len(completed)}/{job_count} jobs.",
    )


def cmd_render_status(_cmd):
    r, error = get_resolve()
    if error:
        return err(error)
    pm = r.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        return err("Chưa có project nào được mở.")
    is_rendering = project.IsRenderingInProgress()
    jobs = project.GetRenderJobList() or []
    return ok(
        is_rendering=is_rendering,
        total_jobs=len(jobs),
        jobs=[{
            "id": j.get("JobId"),
            "name": j.get("TimelineName"),
            "status": j.get("JobStatus"),
            "progress": j.get("CompletionPercentage"),
        } for j in jobs],
    )


# ── Dispatch ─────────────────────────────────────────────────────────────────
HANDLERS = {
    "ping":             cmd_ping,
    "get_info":         cmd_get_info,
    "project_open":     cmd_project_open,
    "project_create":   cmd_project_create,
    "clip_import":      cmd_clip_import,
    "color_apply_lut":  cmd_color_apply_lut,
    "timeline_export":  cmd_timeline_export,
    "render_start":     cmd_render_start,
    "render_status":    cmd_render_status,
}

def main():
    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            cmd = json.loads(raw_line)
        except json.JSONDecodeError as e:
            print(json.dumps({"ok": False, "error": f"Invalid JSON: {e}"}), flush=True)
            continue

        action = cmd.get("action", "")
        handler = HANDLERS.get(action)
        if not handler:
            print(json.dumps({"ok": False, "error": f"Unknown action: {action}. Available: {list(HANDLERS)}"}), flush=True)
            continue

        try:
            result = handler(cmd)
            print(json.dumps(result, default=str), flush=True)
        except Exception as e:
            print(json.dumps({"ok": False, "error": f"Handler error [{action}]: {e}"}), flush=True)

if __name__ == "__main__":
    main()
