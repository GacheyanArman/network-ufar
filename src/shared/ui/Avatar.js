/**
 * Optimized Avatar component with fallback
 * @param {Object} props
 * @param {string} props.src - Image URL
 * @param {string} props.alt - Alt text (used for fallback initial)
 * @param {number} props.size - Size in pixels (default: 48)
 * @param {string} props.className - Additional CSS classes
 */
import Image from "next/image";

export default function Avatar({ src, thumbnailUrl = undefined, alt = "User", size = 48, className = "" }) {
  const initial = alt.charAt(0).toUpperCase() || "U";

  if (!src) {
    return (
      <div
        className={`avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--french-blue, #2c5aa0)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `${size * 0.4}px`,
          fontWeight: 900,
        }}
      >
        {initial}
      </div>
    );
  }

<<<<<<< HEAD
  const resolvedSrc = thumbnailUrl || src;

  // Images stored directly in the database arrive as base64 data URIs.
  // next/image cannot optimize data: URLs, so render a plain <img> to
  // guarantee the avatar is always visible to everyone.
  if (typeof resolvedSrc === "string" && resolvedSrc.startsWith("data:")) {
    const dataImgStyle = {
      width: size,
      height: size,
      borderRadius: "50%",
      objectFit: "cover",
    };

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className={`avatar ${className}`}
        style={dataImgStyle}
      />
    );
  }

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
  return (
    <Image
      src={thumbnailUrl || src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  );
}
