import { useState, useCallback } from "react";
import L from "leaflet";

interface UseDraggableMarkerProps {
  initialLat: number;
  initialLng: number;
  onCoordinateChange?: (lat: number, lng: number) => void;
  isEditable: boolean;
}

interface UseDraggableMarkerReturn {
  currentLat: number;
  currentLng: number;
  isDragging: boolean;
  hasChanges: boolean;
  originalLat: number;
  originalLng: number;
  handleDragStart: () => void;
  handleDrag: (e: L.LeafletEvent) => void;
  handleDragEnd: (e: L.LeafletEvent) => void;
  resetPosition: () => void;
  setCurrentPosition: (lat: number, lng: number) => void;
}

/**
 * Custom hook for managing draggable marker state and handlers
 * This consolidates the repeated drag logic found in editable map components
 */
export function useDraggableMarker({
  initialLat,
  initialLng,
  onCoordinateChange,
  isEditable,
}: UseDraggableMarkerProps): UseDraggableMarkerReturn {
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [isDragging, setIsDragging] = useState(false);
  const [originalLat, setOriginalLat] = useState(initialLat);
  const [originalLng, setOriginalLng] = useState(initialLng);

  // Calculate if there are changes from original position
  const hasChanges = currentLat !== originalLat || currentLng !== originalLng;

  const handleDragStart = useCallback(() => {
    if (isEditable) {
      setIsDragging(true);
      setOriginalLat(currentLat);
      setOriginalLng(currentLng);
    }
  }, [isEditable, currentLat, currentLng]);

  const handleDrag = useCallback((e: L.LeafletEvent) => {
    if (isEditable) {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      setCurrentLat(position.lat);
      setCurrentLng(position.lng);
    }
  }, [isEditable]);

  const handleDragEnd = useCallback((e: L.LeafletEvent) => {
    if (isEditable) {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      setCurrentLat(position.lat);
      setCurrentLng(position.lng);
      setIsDragging(false);

      if (onCoordinateChange) {
        onCoordinateChange(position.lat, position.lng);
      }
    }
  }, [isEditable, onCoordinateChange]);

  const resetPosition = useCallback(() => {
    setCurrentLat(originalLat);
    setCurrentLng(originalLng);
  }, [originalLat, originalLng]);

  const setCurrentPosition = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
  }, []);

  return {
    currentLat,
    currentLng,
    isDragging,
    hasChanges,
    originalLat,
    originalLng,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    resetPosition,
    setCurrentPosition,
  };
}