import Image from "next/image";
import type { RigSize } from "@prisma/client";

interface RigIconProps {
  rigSize: RigSize;
  size?: number;
  className?: string;
}

export function RigIcon({ rigSize, size = 24, className = "" }: RigIconProps) {
  const rigNumber = rigSize.replace('AERO_', '');

  return (
    <Image
      src={`/icons/aero-${rigNumber}.jpg`}
      alt={`RS Aero ${rigNumber}`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}

export function RigIconWithText({ rigSize, size = 24, className = "" }: RigIconProps) {
  const rigNumber = rigSize.replace('AERO_', '');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <RigIcon rigSize={rigSize} size={size} />
      <span>Aero {rigNumber}</span>
    </div>
  );
}