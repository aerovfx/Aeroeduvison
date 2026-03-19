/**
 * OpenFang Service Control API
 * Allows starting/stopping OpenFang Agent OS from the browser
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OPENFANG_BASE_URL = process.env.OPENFANG_BASE_URL || 'http://127.0.0.1:4200';
const OPENFANG_DIR = path.join(process.cwd(), '..', 'openfang-core');

// PID file location
const PID_FILE = path.join(process.cwd(), '.openfang.pid');

/**
 * Check if OpenFang service is running
 */
async function checkOpenFangStatus(): Promise<{ running: boolean; pid?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${OPENFANG_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return { running: true, pid: getStoredPid() };
    }
  } catch (error) {
    // Service not running
  }
  
  return { running: false };
}

/**
 * Get stored PID from file
 */
function getStoredPid(): number | undefined {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
      return isNaN(pid) ? undefined : pid;
    }
  } catch (error) {
    console.error('Error reading PID file:', error);
  }
  return undefined;
}

/**
 * Store PID to file
 */
function storePid(pid: number) {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf-8');
  } catch (error) {
    console.error('Error storing PID:', error);
  }
}

/**
 * Clear PID file
 */
function clearPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (error) {
    console.error('Error clearing PID file:', error);
  }
}

/**
 * Start OpenFang service
 */
async function startOpenFang(): Promise<{ success: boolean; error?: string; pid?: number }> {
  // Check if already running
  const status = await checkOpenFangStatus();
  if (status.running) {
    return { success: true, pid: status.pid, error: 'Service already running' };
  }
  
  // Check if OpenFang directory exists
  if (!fs.existsSync(OPENFANG_DIR)) {
    return { 
      success: false, 
      error: `OpenFang directory not found: ${OPENFANG_DIR}. Please ensure openfang-core is installed.` 
    };
  }
  
  try {
    // Start OpenFang as a detached process
    const child = spawn('cargo', ['run', '--release'], {
      cwd: OPENFANG_DIR,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env }
    });
    
    // Store PID
    if (child.pid) {
      storePid(child.pid);
    }
    
    // Detach the child process so it continues running
    child.unref();
    
    // Wait a bit for service to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify service started
    const newStatus = await checkOpenFangStatus();
    if (newStatus.running) {
      return { success: true, pid: child.pid };
    }
    
    return { 
      success: false, 
      error: 'Service started but health check failed. Check OpenFang logs for details.' 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Failed to start OpenFang: ${errorMessage}` };
  }
}

/**
 * Stop OpenFang service
 */
async function stopOpenFang(): Promise<{ success: boolean; error?: string }> {
  const status = await checkOpenFangStatus();
  
  if (!status.running) {
    return { success: true, error: 'Service already stopped' };
  }
  
  try {
    // Try to stop using stored PID
    const pid = getStoredPid();
    if (pid) {
      try {
        process.kill(pid, 'SIGTERM');
        clearPid();
        
        // Wait for process to stop
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify service stopped
        const newStatus = await checkOpenFangStatus();
        if (!newStatus.running) {
          return { success: true };
        }
      } catch (error) {
        // Process might already be dead
        clearPid();
        return { success: true };
      }
    }
    
    // If we can't find the PID, try to find by process name
    // This is a fallback and may not work on all systems
    return { 
      success: false, 
      error: 'Could not stop service. Please stop it manually from terminal.' 
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Failed to stop OpenFang: ${errorMessage}` };
  }
}

// GET - Check service status
export async function GET() {
  const status = await checkOpenFangStatus();
  return NextResponse.json({
    running: status.running,
    pid: status.pid,
    url: OPENFANG_BASE_URL,
  });
}

// POST - Start/Stop service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'start') {
      const result = await startOpenFang();
      return NextResponse.json(result);
    } else if (action === 'stop') {
      const result = await stopOpenFang();
      return NextResponse.json(result);
    } else if (action === 'status') {
      const status = await checkOpenFangStatus();
      return NextResponse.json({
        running: status.running,
        pid: status.pid,
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "start", "stop", or "status"' },
      { status: 400 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
