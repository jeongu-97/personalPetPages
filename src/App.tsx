import { useState, useRef, useEffect } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Heart, Activity, Calendar, Weight, Ruler, MapPin } from 'lucide-react';

interface ParallaxProps {
  mouseX: number;
  mouseY: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Pet data
const petData = {
  name: '버디',
  breed: '골든 리트리버',
  age: '3살',
  weight: '28kg',
  gender: '수컷',
  location: '서울, 대한민국',
  favoriteFood: '닭고기 간식',
  favoriteToy: '테니스공',
  personality: '활발하고 사랑스러운 성격이에요. 사람들을 좋아하고 새로운 친구를 사귀는 것을 즐겨요.',
  healthNotes: '최근 건강검진 완료 (2026.01.15)',
  mainPhoto: 'https://images.unsplash.com/photo-1683212144556-472045913c76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZ29sZGVuJTIwcmV0cmlldmVyJTIwZG9nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcwMDE4OTg2fDA&ixlib=rb-4.1.0&q=80&w=1080',
};

function BackgroundLayer({ mouseX, mouseY }: ParallaxProps) {
  const windowCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
  const windowCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
  
  const backgroundMovementMultiplier = 0.02;
  const transformX = (mouseX - windowCenterX) * backgroundMovementMultiplier;
  const transformY = (mouseY - windowCenterY) * backgroundMovementMultiplier;

  return (
    <div
      className="absolute inset-0 w-full h-full z-0 transition-transform duration-500 ease-out"
      style={{
        transform: `translate(${transformX}px, ${transformY}px) scale(1.1)`,
        transformOrigin: 'center center',
        background: 'linear-gradient(135deg, #e0e5ec 0%, #ffffff 100%)',
      }}
    />
  );
}

function PetProfileCard({ mouseX, mouseY }: ParallaxProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const calculateRotation = () => {
    if (!cardRef.current) return { x: 0, y: 0 };
    
    const rect = cardRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const cardCenterX = rect.left + rect.width / 2;
    const windowCenterY = windowHeight / 2;
    
    const xRel = (mouseX - cardCenterX) / rect.width;
    const yRel = (mouseY - windowCenterY) / windowHeight;
    
    const yAngle = xRel * 15;
    const xAngle = Math.max(-15, Math.min(15, -yRel * 15));
    
    return { x: xAngle, y: yAngle };
  };

  const rotation = calculateRotation();

  return (
    <div 
      ref={cardRef}
      className="relative w-full max-w-md mx-auto z-20 h-full flex items-center"
      style={{ maxHeight: '96vh' }}
    >
      <div
        className="w-full transition-transform duration-150 ease-out"
        style={{
          transform: `perspective(1000px) translateZ(30px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Neumorphism outer container */}
        <div 
          className="rounded-3xl mx-3"
          style={{
            background: '#e0e5ec',
            boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
            padding: 'clamp(4px, 0.4vh, 8px)',
          }}
        >
          {/* Glassmorphism inner card */}
          <div 
            className="rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              maxHeight: '94vh',
            }}
          >
            {/* Main pet photo */}
            <div 
              className="overflow-hidden relative shrink-0"
              style={{ height: 'clamp(200px, 32vh, 280px)' }}
            >
              <ImageWithFallback
                src={petData.mainPhoto}
                alt={petData.name}
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                }}
              />
            </div>

            {/* Pet info - scrollable if needed */}
            <div 
              className="overflow-y-auto flex-1"
              style={{
                padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2.5vw, 24px)',
              }}
            >
              <div className="space-y-[clamp(8px,1.5vh,16px)]">
                {/* Title */}
                <div className="text-center">
                  <h1 
                    className="mb-1"
                    style={{ fontSize: 'clamp(24px, 4vh, 36px)' }}
                  >
                    {petData.name}
                  </h1>
                  <p 
                    className="text-gray-600"
                    style={{ fontSize: 'clamp(14px, 2.2vh, 20px)' }}
                  >
                    {petData.breed}
                  </p>
                </div>

                {/* Info grid */}
                <div 
                  className="grid grid-cols-2"
                  style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}
                >
                  {[
                    { icon: Calendar, label: '나이', value: petData.age },
                    { icon: Weight, label: '체중', value: petData.weight },
                    { icon: Ruler, label: '성별', value: petData.gender },
                    { icon: MapPin, label: '위치', value: petData.location },
                  ].map(({ icon: Icon, label, value }) => (
                    <div 
                      key={label}
                      className="flex items-center gap-2 text-gray-700 rounded-2xl"
                      style={{
                        background: '#e0e5ec',
                        boxShadow: 'inset 8px 8px 16px #b8bec5, inset -8px -8px 16px #ffffff',
                        padding: 'clamp(8px, 1.2vh, 16px)',
                      }}
                    >
                      <Icon 
                        className="text-purple-500 shrink-0"
                        style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                      />
                      <div className="min-w-0">
                        <div 
                          className="text-gray-500"
                          style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}
                        >
                          {label}
                        </div>
                        <div 
                          className="font-medium truncate"
                          style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                        >
                          {value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Personality section */}
                <div 
                  className="rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    padding: 'clamp(10px, 1.5vh, 20px)',
                  }}
                >
                  <div className="flex items-start gap-2 text-gray-700">
                    <Heart 
                      className="text-red-500 mt-0.5 shrink-0"
                      style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                    />
                    <div className="min-w-0">
                      <div 
                        className="text-gray-500 mb-1"
                        style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}
                      >
                        성격
                      </div>
                      <p 
                        className="leading-relaxed"
                        style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                      >
                        {petData.personality}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Health section */}
                <div 
                  className="rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    padding: 'clamp(10px, 1.5vh, 20px)',
                  }}
                >
                  <div className="flex items-start gap-2 text-gray-700">
                    <Activity 
                      className="text-green-500 mt-0.5 shrink-0"
                      style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                    />
                    <div className="min-w-0">
                      <div 
                        className="text-gray-500 mb-1"
                        style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}
                      >
                        건강 정보
                      </div>
                      <p 
                        style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                      >
                        {petData.healthNotes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favorites */}
                <div 
                  className="grid grid-cols-2"
                  style={{ gap: 'clamp(8px, 1.2vh, 12px)' }}
                >
                  {[
                    { label: '좋아하는 음식', value: petData.favoriteFood },
                    { label: '좋아하는 장난감', value: petData.favoriteToy },
                  ].map(({ label, value }) => (
                    <div 
                      key={label}
                      className="rounded-2xl"
                      style={{
                        background: '#e0e5ec',
                        boxShadow: '12px 12px 24px #b8bec5, -12px -12px 24px #ffffff',
                        padding: 'clamp(10px, 1.5vh, 16px)',
                      }}
                    >
                      <div 
                        className="text-gray-500 mb-1"
                        style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}
                      >
                        {label}
                      </div>
                      <div 
                        className="font-medium text-gray-800"
                        style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomCursor({ x, y, isVisible }: { x: number; y: number; isVisible: boolean }) {
  return (
    <div
      className="absolute pointer-events-none z-50 transition-opacity duration-150"
      style={{
        left: x - 12,
        top: y - 12,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="w-6 h-6 bg-yellow-400 rounded-full" />
    </div>
  );
}

export default function PetProfileApp() {
  const [mousePosition, setMousePosition] = useState({ x: 300, y: 400 });
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isMobileInput, setIsMobileInput] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const [motionPermissionDenied, setMotionPermissionDenied] = useState(false);
  const [isMotionEnabled, setIsMotionEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setIsMobileInput(hasCoarsePointer);
  }, []);

  useEffect(() => {
    if (!isMobileInput) return;
    const supportsOrientation =
      typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';

    if (!supportsOrientation) {
      setNeedsMotionPermission(false);
      setIsMotionEnabled(false);
      return;
    }
    const needsPermission =
      typeof window !== 'undefined' &&
      typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> })
        ?.requestPermission === 'function';

    if (needsPermission) {
      setNeedsMotionPermission(true);
      setIsMotionEnabled(false);
    } else {
      setNeedsMotionPermission(false);
      setIsMotionEnabled(true);
    }
  }, [isMobileInput]);

  useEffect(() => {
    if (isMobileInput) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          setMousePosition({ x, y });
          setIsMouseInside(true);
        }
      }
    };

    const handleMouseLeave = () => {
      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
      setMousePosition({ x: centerX, y: centerY });
      setIsMouseInside(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [isMobileInput]);

  useEffect(() => {
    if (!isMobileInput || !isMotionEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      const gamma = event.gamma;
      if (beta === null || gamma === null) return;

      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      const maxTilt = 22;
      const xTilt = clamp(gamma / maxTilt, -1, 1);
      const yTilt = clamp(beta / maxTilt, -1, 1);

      const offsetX = xTilt * width * 0.35;
      const offsetY = -yTilt * height * 0.35;

      setMousePosition({ x: centerX + offsetX, y: centerY + offsetY });
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isMobileInput, isMotionEnabled]);

  const handleEnableMotion = async () => {
    try {
      const requestPermission = (window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      })?.requestPermission;

      if (!requestPermission) {
        setNeedsMotionPermission(false);
        setIsMotionEnabled(true);
        return;
      }

      const result = await requestPermission();
      if (result === 'granted') {
        setNeedsMotionPermission(false);
        setMotionPermissionDenied(false);
        setIsMotionEnabled(true);
      } else {
        setMotionPermissionDenied(true);
        setIsMotionEnabled(false);
      }
    } catch {
      setMotionPermissionDenied(true);
      setIsMotionEnabled(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="bg-[#e0e5ec] relative w-full h-screen overflow-hidden"
      style={{ cursor: 'none' }}
    >
      {isMobileInput && needsMotionPermission && (
        <div className="absolute top-4 right-4 z-50">
          <button
            type="button"
            onClick={handleEnableMotion}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-700"
            style={{
              background: '#e0e5ec',
              boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            {motionPermissionDenied ? '모션 권한 필요' : '모션 허용'}
          </button>
        </div>
      )}
      <div className="flex items-center justify-center w-full h-full">
        <BackgroundLayer mouseX={mousePosition.x} mouseY={mousePosition.y} />
        <PetProfileCard mouseX={mousePosition.x} mouseY={mousePosition.y} />
        {!isMobileInput && (
          <CustomCursor x={mousePosition.x} y={mousePosition.y} isVisible={isMouseInside} />
        )}
      </div>
    </div>
  );
}
