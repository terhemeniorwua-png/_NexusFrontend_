import Image from 'next/image';

type LogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function Logo({ size = 32, className = '', priority = false }: LogoProps) {
  return (
    <Image
      src="/logo-256.png"
      alt="PITERON"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
