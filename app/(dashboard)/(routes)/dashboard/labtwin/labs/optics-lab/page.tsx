'use client';

"use client";

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, CheckCircle, Trophy, Scan } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

type MirrorType = 'plane' | 'concave' | 'convex';

interface MirrorData {
  mirrorType: MirrorType;
  objectDistance: number; // d
  imageDistance: number; // d'
  focalLength: number; // f
  magnification: number; // k
  imageType: 'real' | 'virtual' | 'none';
  imageOrientation: 'upright' | 'inverted' | 'none';
  imageSize: 'larger' | 'smaller' | 'same' | 'none';
}

export default function OpticsLabPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [mirrorType, setMirrorType] = useState<MirrorType>('plane');
  const [objectDistance, setObjectDistance] = useState(30); // cm
  const [focalLength] = useState(15); // cm - fixed for curved mirrors
  const [mirrorData, setMirrorData] = useState<MirrorData | null>(null);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values
  const initialValues = useRef({
    mirrorType: 'plane' as MirrorType,
    objectDistance: 30
  });

  // Lab configuration
  const config = {
    name: "optics-lab",
    title: "Phản xạ ánh sáng - Gương phẳng và Gương cầu",
    description: "Khảo sát phản xạ ánh sáng qua gương phẳng, gương lồi và gương lõm",
    category: "Quang học",
    level: "Lớp 11",
    duration: "45 phút",
    xp: 85,
    port: 8013
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Set backend as offline since we're using client-side calculations
    setBackendStatus('offline');
  }, [isMounted]);

  // Calculate mirror reflection characteristics
  useEffect(() => {
    if (!isMounted) return;
    
    let data: MirrorData;
    
    if (mirrorType === 'plane') {
      // Plane mirror: d' = -d (virtual image, same size, upright)
      data = {
        mirrorType: 'plane',
        objectDistance,
        imageDistance: -objectDistance,
        focalLength: Infinity,
        magnification: 1,
        imageType: 'virtual',
        imageOrientation: 'upright',
        imageSize: 'same'
      };
    } else {
      // Curved mirrors: 1/f = 1/d + 1/d'
      const f = mirrorType === 'concave' ? focalLength : -focalLength;
      
      if (Math.abs(objectDistance - Math.abs(f)) < 0.1) {
        // At focal point
        data = {
          mirrorType,
          objectDistance,
          imageDistance: Infinity,
          focalLength: f,
          magnification: Infinity,
          imageType: 'none',
          imageOrientation: 'none',
          imageSize: 'none'
        };
      } else {
        // Mirror equation: 1/f = 1/d + 1/d' => d' = (f*d)/(d-f)
        const dPrime = (f * objectDistance) / (objectDistance - f);
        const k = -dPrime / objectDistance;
        
        data = {
          mirrorType,
          objectDistance,
          imageDistance: dPrime,
          focalLength: f,
          magnification: k,
          imageType: dPrime > 0 ? 'real' : 'virtual',
          imageOrientation: k > 0 ? 'upright' : 'inverted',
          imageSize: Math.abs(k) > 1 ? 'larger' : Math.abs(k) < 1 ? 'smaller' : 'same'
        };
      }
    }
    
    setMirrorData(data);
  }, [mirrorType, objectDistance, focalLength, isMounted]);

  // Draw canvas
  useEffect(() => {
    if (!isMounted || !mirrorData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 1000;
    canvas.height = 500;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const scale = 5;
    const mirrorX = canvas.width / 2 + 100;
    
    // Draw optical axis (principal axis)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, centerY);
    ctx.lineTo(canvas.width - 50, centerY);
    ctx.stroke();
    
    // Draw mirror based on type
    const mirrorHeight = 180;
    
    if (mirrorType === 'plane') {
      // Plane mirror - vertical line with reflective surface
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(mirrorX, centerY - mirrorHeight / 2);
      ctx.lineTo(mirrorX, centerY + mirrorHeight / 2);
      ctx.stroke();
      
      // Reflective side indicator (silver/metallic)
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(mirrorX - 15, centerY - mirrorHeight / 2, 15, mirrorHeight);
      
      // Reflective surface lines
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      for (let y = centerY - mirrorHeight / 2; y <= centerY + mirrorHeight / 2; y += 15) {
        ctx.beginPath();
        ctx.moveTo(mirrorX - 12, y);
        ctx.lineTo(mirrorX - 3, y);
        ctx.stroke();
      }
      
    } else if (mirrorType === 'concave') {
      // Concave mirror - professional curve
      const radius = 120;
      const centerX = mirrorX - radius;
      
      // Mirror surface (thick blue line)
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI/3, Math.PI/3);
      ctx.stroke();
      
      // Reflective surface (silver)
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 5, -Math.PI/3, Math.PI/3);
      ctx.lineTo(centerX + (radius - 5) * Math.cos(Math.PI/3), centerY + (radius - 5) * Math.sin(Math.PI/3));
      ctx.lineTo(centerX + radius * Math.cos(Math.PI/3), centerY + radius * Math.sin(Math.PI/3));
      ctx.lineTo(centerX + radius * Math.cos(-Math.PI/3), centerY + radius * Math.sin(-Math.PI/3));
      ctx.lineTo(centerX + (radius - 5) * Math.cos(-Math.PI/3), centerY + (radius - 5) * Math.sin(-Math.PI/3));
      ctx.closePath();
      ctx.fill();
      
      // Focal point (F)
      const focalX = centerX + radius/2;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(focalX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', focalX, centerY + 6);
      
      // Center of curvature (C)
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('C', centerX, centerY - 15);
      
    } else {
      // Convex mirror - professional curve
      const radius = 120;
      const centerX = mirrorX + radius;
      
      // Mirror surface (thick orange line)
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
      ctx.stroke();
      
      // Reflective surface (silver)
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 5, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
      ctx.lineTo(centerX + (radius - 5) * Math.cos(Math.PI + Math.PI/3), centerY + (radius - 5) * Math.sin(Math.PI + Math.PI/3));
      ctx.lineTo(centerX + radius * Math.cos(Math.PI + Math.PI/3), centerY + radius * Math.sin(Math.PI + Math.PI/3));
      ctx.lineTo(centerX + radius * Math.cos(Math.PI - Math.PI/3), centerY + radius * Math.sin(Math.PI - Math.PI/3));
      ctx.lineTo(centerX + (radius - 5) * Math.cos(Math.PI - Math.PI/3), centerY + (radius - 5) * Math.sin(Math.PI - Math.PI/3));
      ctx.closePath();
      ctx.fill();
      
      // Virtual focal point (F) - behind mirror
      const focalX = centerX - radius/2;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.arc(focalX, centerY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('F', focalX, centerY - 15);
    }
    
    // Draw rays FIRST (so they're behind objects) - Object AB like reference
    const objectX = mirrorX - (objectDistance * scale);
    const objectHeight = 60; // Height of object AB
    const objectTopY = centerY - objectHeight; // Top of object (point B)
    
    // Calculate mirror intersection points for 4 rays from B (top of object)
    let ray1Intersection, ray2Intersection, ray3Intersection, ray4Intersection;
    
    if (mirrorType === 'plane') {
      ray1Intersection = { x: mirrorX, y: objectTopY }; // Parallel ray
      ray2Intersection = { x: mirrorX, y: centerY }; // Through pole
      ray3Intersection = { x: mirrorX, y: centerY }; // Through pole (same as ray 2)
      ray4Intersection = { x: mirrorX, y: objectTopY }; // Through center
    } else if (mirrorType === 'concave') {
      ray1Intersection = { x: mirrorX, y: objectTopY }; // Parallel ray
      ray2Intersection = { x: mirrorX, y: centerY }; // Through pole
      ray3Intersection = { x: mirrorX, y: centerY }; // Through pole (same as ray 2)
      ray4Intersection = { x: mirrorX - 20, y: objectTopY }; // Through center of curvature
    } else {
      // Convex mirror
      ray1Intersection = { x: mirrorX, y: objectTopY }; // Parallel ray
      ray2Intersection = { x: mirrorX, y: centerY }; // Through pole
      ray3Intersection = { x: mirrorX, y: centerY }; // Through pole (same as ray 2)
      ray4Intersection = { x: mirrorX + 20, y: objectTopY }; // Through center of curvature
    }
    
    // Ray 1: Parallel to principal axis (black solid line)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(objectX, objectTopY);
    ctx.lineTo(ray1Intersection.x, ray1Intersection.y);
    ctx.stroke();
    
    // Add arrow to incident ray 1
    const angle1 = Math.atan2(ray1Intersection.y - objectTopY, ray1Intersection.x - objectX);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(ray1Intersection.x - 15 * Math.cos(angle1), ray1Intersection.y - 15 * Math.sin(angle1));
    ctx.lineTo(ray1Intersection.x - 20 * Math.cos(angle1) + 8 * Math.cos(angle1 + Math.PI/6), 
               ray1Intersection.y - 20 * Math.sin(angle1) + 8 * Math.sin(angle1 + Math.PI/6));
    ctx.lineTo(ray1Intersection.x - 20 * Math.cos(angle1) + 8 * Math.cos(angle1 - Math.PI/6), 
               ray1Intersection.y - 20 * Math.sin(angle1) + 8 * Math.sin(angle1 - Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Ray 2: Through focal point (black solid line)
    ctx.beginPath();
    ctx.moveTo(objectX, objectTopY);
    ctx.lineTo(ray2Intersection.x, ray2Intersection.y);
    ctx.stroke();
    
    // Add arrow to incident ray 2
    const angle2 = Math.atan2(ray2Intersection.y - objectTopY, ray2Intersection.x - objectX);
    ctx.beginPath();
    ctx.moveTo(ray2Intersection.x - 15 * Math.cos(angle2), ray2Intersection.y - 15 * Math.sin(angle2));
    ctx.lineTo(ray2Intersection.x - 20 * Math.cos(angle2) + 8 * Math.cos(angle2 + Math.PI/6), 
               ray2Intersection.y - 20 * Math.sin(angle2) + 8 * Math.sin(angle2 + Math.PI/6));
    ctx.lineTo(ray2Intersection.x - 20 * Math.cos(angle2) + 8 * Math.cos(angle2 - Math.PI/6), 
               ray2Intersection.y - 20 * Math.sin(angle2) + 8 * Math.sin(angle2 - Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Ray 3: Through pole (black solid line)
    ctx.beginPath();
    ctx.moveTo(objectX, objectTopY);
    ctx.lineTo(ray3Intersection.x, ray3Intersection.y);
    ctx.stroke();
    
    // Add arrow to incident ray 3
    const angle3 = Math.atan2(ray3Intersection.y - objectTopY, ray3Intersection.x - objectX);
    ctx.beginPath();
    ctx.moveTo(ray3Intersection.x - 15 * Math.cos(angle3), ray3Intersection.y - 15 * Math.sin(angle3));
    ctx.lineTo(ray3Intersection.x - 20 * Math.cos(angle3) + 8 * Math.cos(angle3 + Math.PI/6), 
               ray3Intersection.y - 20 * Math.sin(angle3) + 8 * Math.sin(angle3 + Math.PI/6));
    ctx.lineTo(ray3Intersection.x - 20 * Math.cos(angle3) + 8 * Math.cos(angle3 - Math.PI/6), 
               ray3Intersection.y - 20 * Math.sin(angle3) + 8 * Math.sin(angle3 - Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Ray 4: Through center of curvature (black solid line)
    ctx.beginPath();
    ctx.moveTo(objectX, objectTopY);
    ctx.lineTo(ray4Intersection.x, ray4Intersection.y);
    ctx.stroke();
    
    // Add arrow to incident ray 4
    const angle4 = Math.atan2(ray4Intersection.y - objectTopY, ray4Intersection.x - objectX);
    ctx.beginPath();
    ctx.moveTo(ray4Intersection.x - 15 * Math.cos(angle4), ray4Intersection.y - 15 * Math.sin(angle4));
    ctx.lineTo(ray4Intersection.x - 20 * Math.cos(angle4) + 8 * Math.cos(angle4 + Math.PI/6), 
               ray4Intersection.y - 20 * Math.sin(angle4) + 8 * Math.sin(angle4 + Math.PI/6));
    ctx.lineTo(ray4Intersection.x - 20 * Math.cos(angle4) + 8 * Math.cos(angle4 - Math.PI/6), 
               ray4Intersection.y - 20 * Math.sin(angle4) + 8 * Math.sin(angle4 - Math.PI/6));
    ctx.closePath();
    ctx.fill();
    
    // Reflected rays (black solid lines)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    if (mirrorType === 'plane') {
      // Plane mirror: rays reflect symmetrically
      const reflectedLength = 150;
      
      // Reflected ray 1: symmetric reflection
      const reflectedAngle1 = -angle1;
      ctx.beginPath();
      ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
      ctx.lineTo(ray1Intersection.x + reflectedLength * Math.cos(reflectedAngle1), 
                 ray1Intersection.y + reflectedLength * Math.sin(reflectedAngle1));
      ctx.stroke();
      
      // Reflected ray 2: symmetric reflection
      const reflectedAngle2 = -angle2;
      ctx.beginPath();
      ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
      ctx.lineTo(ray2Intersection.x + reflectedLength * Math.cos(reflectedAngle2), 
                 ray2Intersection.y + reflectedLength * Math.sin(reflectedAngle2));
      ctx.stroke();
      
      // Reflected ray 3: symmetric reflection
      const reflectedAngle3 = -angle3;
      ctx.beginPath();
      ctx.moveTo(ray3Intersection.x, ray3Intersection.y);
      ctx.lineTo(ray3Intersection.x + reflectedLength * Math.cos(reflectedAngle3), 
                 ray3Intersection.y + reflectedLength * Math.sin(reflectedAngle3));
      ctx.stroke();
      
      // Reflected ray 4: symmetric reflection
      const reflectedAngle4 = -angle4;
      ctx.beginPath();
      ctx.moveTo(ray4Intersection.x, ray4Intersection.y);
      ctx.lineTo(ray4Intersection.x + reflectedLength * Math.cos(reflectedAngle4), 
                 ray4Intersection.y + reflectedLength * Math.sin(reflectedAngle4));
      ctx.stroke();
      
      // Draw dashed extensions behind mirror to show virtual image formation
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2;
      
      // Extension of reflected rays (behind mirror) - they should converge at S'
      const extensionLength = 100;
      ctx.beginPath();
      ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
      ctx.lineTo(ray1Intersection.x - extensionLength * Math.cos(reflectedAngle1), 
                 ray1Intersection.y - extensionLength * Math.sin(reflectedAngle1));
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
      ctx.lineTo(ray2Intersection.x - extensionLength * Math.cos(reflectedAngle2), 
                 ray2Intersection.y - extensionLength * Math.sin(reflectedAngle2));
      ctx.stroke();
      
      ctx.setLineDash([]);
      
    } else if (mirrorType === 'concave') {
      // Concave mirror: rays converge to form image
      const focalX = mirrorX - (focalLength * scale);
      
      // Reflected ray 1: converges towards focal point
      ctx.beginPath();
      ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
      ctx.lineTo(focalX, centerY);
      ctx.stroke();
      
      // Reflected ray 2: converges towards focal point
      ctx.beginPath();
      ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
      ctx.lineTo(focalX, centerY);
      ctx.stroke();
      
      // Reflected ray 3: converges towards focal point
      ctx.beginPath();
      ctx.moveTo(ray3Intersection.x, ray3Intersection.y);
      ctx.lineTo(focalX, centerY);
      ctx.stroke();
      
      // Reflected ray 4: converges towards focal point
      ctx.beginPath();
      ctx.moveTo(ray4Intersection.x, ray4Intersection.y);
      ctx.lineTo(focalX, centerY);
      ctx.stroke();
      
      // Draw dashed extensions behind mirror to show virtual image formation (if virtual)
      if (mirrorData.imageType === 'virtual') {
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        
        // Extension of reflected rays (behind mirror) - they should converge at S'
        ctx.beginPath();
        ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
        ctx.lineTo(ray1Intersection.x - 100, ray1Intersection.y - 50);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
        ctx.lineTo(ray2Intersection.x - 100, ray2Intersection.y + 50);
        ctx.stroke();
        
        ctx.setLineDash([]);
      }
      
    } else {
      // Convex mirror: rays diverge as if from virtual focal point
      const virtualFocalX = mirrorX + (focalLength * scale);
      
      // Reflected ray 1: diverges as if from virtual focal point
      ctx.beginPath();
      ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
      ctx.lineTo(ray1Intersection.x + 200, ray1Intersection.y - 80);
      ctx.stroke();
      
      // Reflected ray 2: diverges as if from virtual focal point
      ctx.beginPath();
      ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
      ctx.lineTo(ray2Intersection.x + 200, ray2Intersection.y + 80);
      ctx.stroke();
      
      // Reflected ray 3: diverges as if from virtual focal point
      ctx.beginPath();
      ctx.moveTo(ray3Intersection.x, ray3Intersection.y);
      ctx.lineTo(ray3Intersection.x + 200, ray3Intersection.y - 60);
      ctx.stroke();
      
      // Reflected ray 4: diverges as if from virtual focal point
      ctx.beginPath();
      ctx.moveTo(ray4Intersection.x, ray4Intersection.y);
      ctx.lineTo(ray4Intersection.x + 200, ray4Intersection.y + 60);
      ctx.stroke();
      
      // Draw dashed extensions behind mirror to show virtual image formation
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2;
      
      // Extension of reflected rays (behind mirror) - they should converge at S'
      ctx.beginPath();
      ctx.moveTo(ray1Intersection.x, ray1Intersection.y);
      ctx.lineTo(virtualFocalX, centerY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(ray2Intersection.x, ray2Intersection.y);
      ctx.lineTo(virtualFocalX, centerY);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Add arrows to reflected rays
    ctx.fillStyle = '#000000';
    // Arrows for reflected rays (simplified)
    if (mirrorType === 'plane') {
      const reflectedAngle = -Math.atan2(objectTopY - centerY, mirrorX - objectX);
      const arrowX = ray1Intersection.x + 120 * Math.cos(reflectedAngle);
      const arrowY = ray1Intersection.y + 120 * Math.sin(reflectedAngle);
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 15 * Math.cos(reflectedAngle) + 8 * Math.cos(reflectedAngle + Math.PI/6), 
                 arrowY - 15 * Math.sin(reflectedAngle) + 8 * Math.sin(reflectedAngle + Math.PI/6));
      ctx.lineTo(arrowX - 15 * Math.cos(reflectedAngle) + 8 * Math.cos(reflectedAngle - Math.PI/6), 
                 arrowY - 15 * Math.sin(reflectedAngle) + 8 * Math.sin(reflectedAngle - Math.PI/6));
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw object AB AFTER rays (on top) - Like reference
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(objectX, centerY);
    ctx.lineTo(objectX, objectTopY);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(objectX, objectTopY);
    ctx.lineTo(objectX - 12, objectTopY + 15);
    ctx.lineTo(objectX + 12, objectTopY + 15);
    ctx.closePath();
    ctx.fill();
    
    // Object label (AB)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AB', objectX, objectTopY - 25);
    
    // Draw image if exists - Image A'B' like reference
    if (mirrorData.imageType !== 'none' && isFinite(mirrorData.imageDistance)) {
      const imageX = mirrorX - (mirrorData.imageDistance * scale);
      const imageHeight = objectHeight * Math.abs(mirrorData.magnification);
      const imageTopY = centerY - imageHeight;
      
      if (mirrorData.imageType === 'real') {
        // Real image - solid black arrow
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(imageX, centerY);
        if (mirrorData.imageOrientation === 'inverted') {
          ctx.lineTo(imageX, centerY + imageHeight);
        } else {
          ctx.lineTo(imageX, imageTopY);
        }
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        if (mirrorData.imageOrientation === 'inverted') {
          ctx.moveTo(imageX, centerY + imageHeight);
          ctx.lineTo(imageX - 12, centerY + imageHeight - 15);
          ctx.lineTo(imageX + 12, centerY + imageHeight - 15);
        } else {
          ctx.moveTo(imageX, imageTopY);
          ctx.lineTo(imageX - 12, imageTopY + 15);
          ctx.lineTo(imageX + 12, imageTopY + 15);
        }
        ctx.closePath();
        ctx.fill();
        
        // Image label (A'B')
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        const labelY = mirrorData.imageOrientation === 'inverted' ? centerY + imageHeight + 25 : imageTopY - 25;
        ctx.fillText("A'B'", imageX, labelY);
        
      } else {
        // Virtual image - dashed arrow (like reference diagram)
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(imageX, centerY);
        ctx.lineTo(imageX, imageTopY);
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(imageX, imageTopY);
        ctx.lineTo(imageX - 12, imageTopY + 15);
        ctx.lineTo(imageX + 12, imageTopY + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.setLineDash([]);
        
        // Image label (A'B')
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("A'B'", imageX, imageTopY - 25);
      }
    }
    
    // Mark key points on principal axis (like reference diagram)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    // Point A (base of object)
    ctx.fillText('A', objectX, centerY + 20);
    
    // Point O (pole of mirror)
    ctx.fillText('O', mirrorX, centerY + 20);
    
    // Point C (center of curvature)
    if (mirrorType === 'concave') {
      const centerX = mirrorX - (2 * focalLength * scale);
      ctx.fillText('C', centerX, centerY + 20);
    } else if (mirrorType === 'convex') {
      const centerX = mirrorX + (2 * focalLength * scale);
      ctx.fillText('C', centerX, centerY + 20);
    }
    
    // Point F (focal point)
    if (mirrorType === 'concave') {
      const focalX = mirrorX - (focalLength * scale);
      ctx.fillText('F', focalX, centerY + 20);
    } else if (mirrorType === 'convex') {
      const focalX = mirrorX + (focalLength * scale);
      ctx.fillText('F', focalX, centerY + 20);
    }
    
    // Point A' (base of image)
    if (mirrorData.imageType !== 'none' && isFinite(mirrorData.imageDistance)) {
      const imageX = mirrorX - (mirrorData.imageDistance * scale);
      ctx.fillText("A'", imageX, centerY + 20);
    }
    
    // Professional distance labels (minimal, clean)
    ctx.font = 'bold 14px Arial';
    
    // Object distance label
    ctx.fillText(`d = ${objectDistance} cm`, objectX, centerY + 40);
    
    // Image distance label (if exists)
    if (mirrorData.imageType !== 'none' && isFinite(mirrorData.imageDistance)) {
      const imageX = mirrorX - (mirrorData.imageDistance * scale);
      const distLabelY = mirrorData.imageOrientation === 'inverted' ? centerY + 40 : centerY - 40;
      ctx.fillText(`d' = ${mirrorData.imageDistance.toFixed(1)} cm`, imageX, distLabelY);
    }
    
    ctx.textAlign = 'left'; // Reset text align
    
  }, [mirrorData, mirrorType, objectDistance, focalLength, isMounted]);

  // Generate comparison table
  const generateMirrorComparison = () => {
    return [
      {
        type: 'Gương phẳng',
        focal: '∞',
        imageType: 'Luôn ảo',
        orientation: 'Cùng chiều',
        size: 'Bằng vật',
        use: 'Soi gương'
      },
      {
        type: 'Gương lồi',
        focal: 'f < 0',
        imageType: 'Luôn ảo',
        orientation: 'Cùng chiều',
        size: 'Nhỏ hơn',
        use: 'Gương chiếu hậu'
      },
      {
        type: 'Gương lõm',
        focal: 'f > 0',
        imageType: 'Thật/Ảo',
        orientation: 'Tùy vị trí',
        size: 'Tùy vị trí',
        use: 'Đèn pha, kính thiên văn'
      }
    ];
  };

  // Detect interaction
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      mirrorType !== initialValues.current.mirrorType ||
      objectDistance !== initialValues.current.objectDistance;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [mirrorType, objectDistance, isMounted, hasInteracted]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      toast({
        title: "🔬 Mô phỏng đang chạy",
        description: "Quan sát sự phản xạ ánh sáng qua gương...",
        duration: 2000,
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      // Simulate lab completion (offline mode)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error completing lab:', error);
      toast({
        title: "❌ Lỗi",
        description: "Không thể hoàn thành thí nghiệm. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const resetSimulation = () => {
    setMirrorType('plane');
    setObjectDistance(30);
    setHasInteracted(false);
    initialValues.current = {
      mirrorType: 'plane',
      objectDistance: 30
    };
  };

  if (!isMounted) {
    return (
      <VisionThemeWrapper>
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading optics lab...</p>
          </div>
        </div>
      </VisionThemeWrapper>
    );
  }

  return (
    <VisionThemeWrapper>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Sparkles className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="secondary">{config.category}</Badge>
          <Badge variant="secondary">{config.level}</Badge>
          <Badge variant="secondary">{config.duration}</Badge>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
            </span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Port {config.port}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Simulation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scan className="h-5 w-5" />
                <span>Mô phỏng phản xạ ánh sáng</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quan sát sự phản xạ và tạo ảnh qua các loại gương
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-6">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-white"
                  width={1000}
                  height={500}
                />
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Mirror Type Selector */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
                  <label className="text-lg font-bold text-blue-900 flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5" />
                    Loại gương
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => setMirrorType('plane')}
                      variant={mirrorType === 'plane' ? 'default' : 'outline'}
                      className={`h-auto py-4 ${mirrorType === 'plane' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : ''}`}
                    >
                      <div className="text-center">
                        <div className="font-bold">Gương phẳng</div>
                        <div className="text-xs mt-1 opacity-90">Plane</div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => setMirrorType('concave')}
                      variant={mirrorType === 'concave' ? 'default' : 'outline'}
                      className={`h-auto py-4 ${mirrorType === 'concave' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''}`}
                    >
                      <div className="text-center">
                        <div className="font-bold">Gương lõm</div>
                        <div className="text-xs mt-1 opacity-90">Concave</div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => setMirrorType('convex')}
                      variant={mirrorType === 'convex' ? 'default' : 'outline'}
                      className={`h-auto py-4 ${mirrorType === 'convex' ? 'bg-gradient-to-r from-amber-600 to-orange-600' : ''}`}
                    >
                      <div className="text-center">
                        <div className="font-bold">Gương lồi</div>
                        <div className="text-xs mt-1 opacity-90">Convex</div>
                      </div>
                    </Button>
                  </div>
                </div>
                
                {/* Object Distance Slider */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-purple-900">
                      Khoảng cách vật (d)
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-purple-300 shadow-md">
                      <span className="text-3xl font-bold text-purple-600">{objectDistance} cm</span>
                    </div>
                  </div>
                  <Slider
                    value={[objectDistance]}
                    onValueChange={(value) => setObjectDistance(value[0])}
                    max={80}
                    min={5}
                    step={1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>5 cm</span>
                    <span>15 cm (f)</span>
                    <span>30 cm</span>
                    <span>80 cm</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={runSimulation}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      size="lg"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>{loading ? 'Đang chạy...' : 'Chạy mô phỏng'}</span>
                    </Button>
                    
                    <Button 
                      onClick={resetSimulation}
                      variant="outline"
                      className="flex items-center space-x-2 border-2"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{t('common.reset')}</span>
                    </Button>
                  </div>
                  
                  {/* Complete Lab Button */}
                  <Button 
                    onClick={completeLab}
                    disabled={!hasInteracted || isCompleted || isCompleting}
                    className={`w-full flex items-center justify-center space-x-2 ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    }`}
                    size="lg"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>✅ Đã hoàn thành</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5" />
                        <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
                      </>
                    )}
                  </Button>
                  
                  {!hasInteracted && !isCompleted && (
                    <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      💡 Thay đổi loại gương hoặc vị trí vật để kích hoạt nút hoàn thành
                    </p>
                  )}
                </div>
                
                {/* Legend */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Chú thích màu sắc
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-red-500 rounded"></div>
                      <span>Vật (màu đỏ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded"></div>
                      <span>Ảnh thật (màu xanh, nét liền)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-purple-500 rounded border border-dashed"></div>
                      <span>Ảnh ảo (màu tím, nét đứt)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-amber-500 rounded"></div>
                      <div className="w-8 h-1 bg-pink-500 rounded"></div>
                      <span>Tia phản xạ</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Image Characteristics */}
          {mirrorData && (
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Đặc điểm ảnh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <div className={`p-4 rounded-lg border-2 ${
                  mirrorData.imageType === 'real' ? 'bg-blue-50 border-blue-200' :
                  mirrorData.imageType === 'virtual' ? 'bg-purple-50 border-purple-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="text-sm font-semibold mb-1">Loại ảnh</div>
                  <div className="text-2xl font-bold">
                    {mirrorData.imageType === 'real' ? '🖼️ Ảnh thật' :
                     mirrorData.imageType === 'virtual' ? '👻 Ảnh ảo' :
                     '❌ Không có ảnh'}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-green-700 font-semibold mb-1">Chiều ảnh</div>
                  <div className="text-xl font-bold text-green-900">
                    {mirrorData.imageOrientation === 'inverted' ? '⬇️ Ngược chiều' :
                     mirrorData.imageOrientation === 'upright' ? '⬆️ Cùng chiều' :
                     '-'}
                  </div>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                  <div className="text-sm text-amber-700 font-semibold mb-1">Kích thước</div>
                  <div className="text-xl font-bold text-amber-900">
                    {mirrorData.imageSize === 'larger' ? '📏 Lớn hơn' :
                     mirrorData.imageSize === 'smaller' ? '📐 Nhỏ hơn' :
                     mirrorData.imageSize === 'same' ? '📊 Bằng vật' :
                     '-'}
                  </div>
                </div>
                
                {isFinite(mirrorData.imageDistance) && (
                  <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
                    <div className="text-sm text-pink-700 font-semibold mb-1">Vị trí ảnh</div>
                    <div className="text-lg font-bold text-pink-900">
                      |d&apos;| = {Math.abs(mirrorData.imageDistance).toFixed(1)} cm
                    </div>
                  </div>
                )}
                
                {isFinite(mirrorData.magnification) && (
                  <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                    <div className="text-sm text-indigo-700 font-semibold mb-1">Độ phóng đại</div>
                    <div className="text-2xl font-bold text-indigo-900">
                      k = {mirrorData.magnification.toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Mirror Comparison */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-indigo-600" />
                So sánh các loại gương
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-100">
                      <TableHead className="text-center font-bold">Loại</TableHead>
                      <TableHead className="text-center font-bold">Tiêu cự</TableHead>
                      <TableHead className="text-center font-bold">Ảnh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateMirrorComparison().map((row, index) => (
                      <TableRow 
                        key={index}
                        className={`
                          ${row.type.includes(mirrorType === 'plane' ? 'phẳng' : mirrorType === 'concave' ? 'lõm' : 'lồi') 
                            ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' 
                            : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <TableCell className="text-center text-xs font-medium">{row.type}</TableCell>
                        <TableCell className="text-center text-xs">{row.focal}</TableCell>
                        <TableCell className="text-center text-xs">{row.imageType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Theory */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-teal-600" />
                Công thức gương cầu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg border-2 border-teal-300">
                  <div className="text-center font-mono text-lg font-bold text-teal-900">
                    1/f = 1/d + 1/d&apos;
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg border-2 border-blue-300">
                  <div className="text-center font-mono text-lg font-bold text-blue-900">
                    k = -d&apos;/d
                  </div>
                </div>
                
                <div className="text-xs space-y-2 text-gray-700">
                  <div>• <strong>f:</strong> Tiêu cự (+ lõm, - lồi)</div>
                  <div>• <strong>d:</strong> Khoảng cách vật (+ trước gương)</div>
                  <div>• <strong>d&apos;:</strong> Khoảng cách ảnh (+ thật, - ảo)</div>
                  <div>• <strong>k:</strong> Độ phóng đại</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lab Info */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-600" />
                Thông tin thí nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Cấp độ:</span>
                  <Badge variant="secondary" className="font-semibold">{config.level}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Thời gian:</span>
                  <span className="text-sm font-bold text-slate-700">{config.duration}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Điểm XP:</span>
                  <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 font-bold">
                    +{config.xp} XP
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Danh mục:</span>
                  <span className="text-sm font-bold text-slate-700">{config.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}
