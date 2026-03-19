#!/usr/bin/env python3
"""
AeroEduvison Camera Recording Service
Records RTSP streams from classroom cameras using FFmpeg
"""

import os
import sys
import json
import signal
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('camera-recorder')

# Configuration
UPLOAD_BASE_DIR = os.getenv('UPLOAD_BASE_DIR', '/uploads/cameras')
MAX_RECORDING_DURATION = int(os.getenv('MAX_RECORDING_DURATION', '7200'))  # 2 hours default
FFMPEG_PRESET = os.getenv('FFMPEG_PRESET', 'ultrafast')
FFMPEG_CRF = int(os.getenv('FFMPEG_CRF', '28'))  # Higher = more compression


class CameraRecorder:
    """Manages RTSP stream recording for a single camera"""
    
    def __init__(self, camera_id: str, camera_name: str, rtsp_url: str, 
                 teacher_id: Optional[str] = None, class_id: Optional[str] = None):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.rtsp_url = rtsp_url
        self.teacher_id = teacher_id
        self.class_id = class_id
        
        self.process: Optional[subprocess.Popen] = None
        self.start_time: Optional[datetime] = None
        self.output_path: Optional[Path] = None
        self.is_recording = False
        self.lock = threading.Lock()
        
    def _get_output_directory(self) -> Path:
        """Create and return the output directory for this recording"""
        date_str = datetime.now().strftime('%Y-%m-%d')
        teacher_dir = self.teacher_id or 'admin'
        
        output_dir = Path(UPLOAD_BASE_DIR) / teacher_dir / self.camera_id / date_str
        output_dir.mkdir(parents=True, exist_ok=True)
        
        return output_dir
    
    def _get_output_filename(self) -> str:
        """Generate output filename with timestamp"""
        timestamp = datetime.now().strftime('%H-%M-%S')
        return f'{timestamp}.mp4'
    
    def start_recording(self) -> Dict:
        """Start recording the RTSP stream"""
        with self.lock:
            if self.is_recording:
                return {
                    'success': False,
                    'error': 'Already recording',
                    'camera_id': self.camera_id
                }
            
            try:
                # Get output path
                output_dir = self._get_output_directory()
                filename = self._get_output_filename()
                self.output_path = output_dir / filename
                
                # Build FFmpeg command
                ffmpeg_cmd = [
                    'ffmpeg',
                    '-rtsp_transport', 'tcp',  # Use TCP for RTSP
                    '-i', self.rtsp_url,
                    '-c:v', 'libx264',
                    '-preset', FFMPEG_PRESET,
                    '-crf', str(FFMPEG_CRF),
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-movflags', '+frag_keyframe+empty_moov',  # Streamable
                    '-max_duration', str(MAX_RECORDING_DURATION),
                    '-y',  # Overwrite if exists
                    str(self.output_path)
                ]
                
                logger.info(f"Starting recording for camera {self.camera_name} ({self.camera_id})")
                logger.info(f"Output path: {self.output_path}")
                logger.info(f"FFmpeg command: {' '.join(ffmpeg_cmd)}")
                
                # Start FFmpeg process
                self.process = subprocess.Popen(
                    ffmpeg_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    stdin=subprocess.PIPE
                )
                
                self.start_time = datetime.now()
                self.is_recording = True
                
                # Start monitoring thread
                monitor_thread = threading.Thread(target=self._monitor_recording, daemon=True)
                monitor_thread.start()
                
                return {
                    'success': True,
                    'message': 'Recording started',
                    'camera_id': self.camera_id,
                    'camera_name': self.camera_name,
                    'output_path': str(self.output_path),
                    'start_time': self.start_time.isoformat(),
                    'video_url': self._get_video_url()
                }
                
            except Exception as e:
                logger.error(f"Failed to start recording: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'camera_id': self.camera_id
                }
    
    def _monitor_recording(self):
        """Monitor the recording process"""
        if not self.process:
            return
        
        # Wait for process to complete or timeout
        try:
            stdout, stderr = self.process.communicate(timeout=MAX_RECORDING_DURATION + 10)
            
            if self.process.returncode == 0:
                logger.info(f"Recording completed successfully: {self.output_path}")
            else:
                logger.error(f"Recording failed with code {self.process.returncode}")
                logger.error(f"FFmpeg stderr: {stderr.decode()}")
            
        except subprocess.TimeoutExpired:
            logger.warning(f"Recording timed out after {MAX_RECORDING_DURATION}s")
            self.process.kill()
        
        finally:
            self.is_recording = False
            self._generate_thumbnail()
    
    def _generate_thumbnail(self):
        """Generate thumbnail from recorded video"""
        if not self.output_path or not self.output_path.exists():
            return
        
        try:
            thumbnail_path = self.output_path.with_suffix('.jpg')
            
            # Extract frame at 5 seconds (or middle if shorter)
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', str(self.output_path),
                '-ss', '00:00:05',
                '-vframes', '1',
                '-vf', 'scale=320:-1',
                '-y',
                str(thumbnail_path)
            ]
            
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            logger.info(f"Thumbnail generated: {thumbnail_path}")
            
        except Exception as e:
            logger.error(f"Failed to generate thumbnail: {e}")
    
    def stop_recording(self) -> Dict:
        """Stop the current recording"""
        with self.lock:
            if not self.is_recording or not self.process:
                return {
                    'success': False,
                    'error': 'Not recording',
                    'camera_id': self.camera_id
                }
            
            try:
                # Send 'q' to FFmpeg to gracefully stop
                self.process.stdin.write(b'q')
                self.process.stdin.flush()
                
                # Wait for process to finish (max 10 seconds)
                try:
                    self.process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                
                end_time = datetime.now()
                duration = int((end_time - self.start_time).total_seconds())
                
                self.is_recording = False
                
                logger.info(f"Recording stopped. Duration: {duration}s")
                
                return {
                    'success': True,
                    'message': 'Recording stopped',
                    'camera_id': self.camera_id,
                    'end_time': end_time.isoformat(),
                    'duration': duration,
                    'video_url': self._get_video_url()
                }
                
            except Exception as e:
                logger.error(f"Failed to stop recording: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'camera_id': self.camera_id
                }
    
    def _get_video_url(self) -> str:
        """Get the URL path for the recorded video"""
        if not self.output_path:
            return ''
        
        # Convert absolute path to URL path
        relative_path = self.output_path.relative_to(Path(UPLOAD_BASE_DIR))
        return f'/api/camera/file/{relative_path}'
    
    def get_status(self) -> Dict:
        """Get current recording status"""
        return {
            'camera_id': self.camera_id,
            'camera_name': self.camera_name,
            'is_recording': self.is_recording,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'duration': int((datetime.now() - self.start_time).total_seconds()) if self.start_time and self.is_recording else None,
            'output_path': str(self.output_path) if self.output_path else None
        }


# Global registry of active recorders
active_recorders: Dict[str, CameraRecorder] = {}
recorders_lock = threading.Lock()


def start_recording(camera_id: str, camera_name: str, rtsp_url: str,
                   teacher_id: Optional[str] = None, class_id: Optional[str] = None) -> Dict:
    """Start recording for a camera"""
    with recorders_lock:
        if camera_id in active_recorders:
            return {
                'success': False,
                'error': 'Camera is already being recorded'
            }
        
        recorder = CameraRecorder(camera_id, camera_name, rtsp_url, teacher_id, class_id)
        active_recorders[camera_id] = recorder
    
    result = recorder.start_recording()
    
    if not result['success']:
        with recorders_lock:
            del active_recorders[camera_id]
    
    return result


def stop_recording(camera_id: str) -> Dict:
    """Stop recording for a camera"""
    with recorders_lock:
        if camera_id not in active_recorders:
            return {
                'success': False,
                'error': 'Camera is not being recorded'
            }
        
        recorder = active_recorders[camera_id]
    
    result = recorder.stop_recording()
    
    if result['success']:
        with recorders_lock:
            del active_recorders[camera_id]
    
    return result


def get_recording_status(camera_id: str) -> Dict:
    """Get recording status for a camera"""
    with recorders_lock:
        if camera_id not in active_recorders:
            return {
                'is_recording': False,
                'camera_id': camera_id
            }
        
        recorder = active_recorders[camera_id]
    
    return recorder.get_status()


def list_recordings(camera_id: Optional[str] = None, 
                   teacher_id: Optional[str] = None,
                   class_id: Optional[str] = None,
                   limit: int = 50) -> List[Dict]:
    """List recorded videos"""
    base_dir = Path(UPLOAD_BASE_DIR)
    
    if not base_dir.exists():
        return []
    
    recordings = []
    
    # Search through directory structure
    for teacher_dir in base_dir.iterdir():
        if not teacher_dir.is_dir():
            continue
        
        if teacher_id and teacher_dir.name != teacher_id:
            continue
        
        for camera_dir in teacher_dir.iterdir():
            if not camera_dir.is_dir():
                continue
            
            if camera_id and camera_dir.name != camera_id:
                continue
            
            for date_dir in camera_dir.iterdir():
                if not date_dir.is_dir():
                    continue
                
                # Find all MP4 files
                for video_file in date_dir.glob('*.mp4'):
                    try:
                        stat = video_file.stat()
                        thumbnail_file = video_file.with_suffix('.jpg')
                        
                        recordings.append({
                            'id': video_file.stem,
                            'camera_id': camera_dir.name,
                            'camera_name': camera_dir.name,
                            'teacher_id': teacher_dir.name,
                            'video_url': f'/api/camera/file/{video_file.relative_to(base_dir)}',
                            'thumbnail_url': f'/api/camera/file/{thumbnail_file.relative_to(base_dir)}' if thumbnail_file.exists() else None,
                            'file_size': stat.st_size,
                            'duration': None,  # Would need to probe with ffprobe
                            'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            'file_path': str(video_file)
                        })
                    except Exception as e:
                        logger.error(f"Error processing file {video_file}: {e}")
    
    # Sort by creation date (newest first)
    recordings.sort(key=lambda x: x['created_at'], reverse=True)
    
    return recordings[:limit]


def get_all_active_recordings() -> List[Dict]:
    """Get all currently active recordings"""
    with recorders_lock:
        return [recorder.get_status() for recorder in active_recorders.values()]


# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal, stopping all recordings...")
    
    with recorders_lock:
        for camera_id, recorder in list(active_recorders.items()):
            recorder.stop_recording()
    
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# Main entry point for CLI usage
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Camera Recording Service')
    parser.add_argument('command', choices=['start', 'stop', 'status', 'list', 'active'])
    parser.add_argument('--camera-id', help='Camera ID')
    parser.add_argument('--camera-name', help='Camera name')
    parser.add_argument('--rtsp-url', help='RTSP URL')
    parser.add_argument('--teacher-id', help='Teacher ID')
    parser.add_argument('--class-id', help='Class ID')
    parser.add_argument('--limit', type=int, default=50, help='Limit for list command')
    
    args = parser.parse_args()
    
    if args.command == 'start':
        if not all([args.camera_id, args.camera_name, args.rtsp_url]):
            print("Error: camera-id, camera-name, and rtsp-url are required")
            sys.exit(1)
        
        result = start_recording(
            args.camera_id,
            args.camera_name,
            args.rtsp_url,
            args.teacher_id,
            args.class_id
        )
        print(json.dumps(result, indent=2))
    
    elif args.command == 'stop':
        if not args.camera_id:
            print("Error: camera-id is required")
            sys.exit(1)
        
        result = stop_recording(args.camera_id)
        print(json.dumps(result, indent=2))
    
    elif args.command == 'status':
        if not args.camera_id:
            print("Error: camera-id is required")
            sys.exit(1)
        
        result = get_recording_status(args.camera_id)
        print(json.dumps(result, indent=2))
    
    elif args.command == 'list':
        result = list_recordings(
            camera_id=args.camera_id,
            teacher_id=args.teacher_id,
            class_id=args.class_id,
            limit=args.limit
        )
        print(json.dumps(result, indent=2))
    
    elif args.command == 'active':
        result = get_all_active_recordings()
        print(json.dumps(result, indent=2))
