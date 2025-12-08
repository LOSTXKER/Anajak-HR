interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({ name, src, size = "md" }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Apple-style gradient based on name
  const getGradient = (name: string) => {
    const gradients = [
      "from-[#ff6b6b] to-[#ee5a24]",
      "from-[#a55eea] to-[#8854d0]",
      "from-[#0984e3] to-[#6c5ce7]",
      "from-[#00b894] to-[#00cec9]",
      "from-[#fd79a8] to-[#e84393]",
      "from-[#fdcb6e] to-[#f39c12]",
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full flex items-center justify-center
        bg-gradient-to-br ${getGradient(name)}
        text-white font-semibold
      `}
    >
      {getInitials(name)}
    </div>
  );
}
