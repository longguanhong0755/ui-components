const useIsStaticRenderer = () => false
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion"
import { useRef, useState, type CSSProperties } from "react"

interface ImageValue {
    src: string
    srcSet?: string
    alt?: string
}

interface LinkPreviewProps {
    title: string
    link?: string
    imageMode: "original" | "custom"
    customImage: ImageValue
    previewWidth: number
    previewHeight: number
    radius: number
    shadow: boolean
    shadowColor: string
    textColor: string
    underlineColor: string
    font: any
    style?: CSSProperties
}

// Resolve the website's own representative image (og:image) for the link.
// Used in "Original" mode. Falls back to a screenshot if the site has no image.
function originalImage(link?: string): string | undefined {
    if (!link) return undefined
    return `https://api.microlink.io/?url=${encodeURIComponent(
        link
    )}&embed=image.url`
}

/**
 * Link Preview
 *
 * An underlined inline link that reveals a floating preview image of the
 * destination on hover. The preview leans toward the cursor. The image can be
 * the link's own live screenshot (Original) or a custom uploaded image.
 *
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 32
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
function __BaseImpl_LinkPreview(props: LinkPreviewProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        title = "Lander Studio",
        link = "https://lander.studio/",
        imageMode = "original",
        customImage,
        previewWidth = 520,
        previewHeight = 300,
        radius = 0,
        shadow = true,
        shadowColor = "rgba(0,0,0,0.30)",
        textColor = "#FFFFFF",
        underlineColor = "#FFFFFF",
        font,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const [hovered, setHovered] = useState(false)
    const containerRef = useRef<HTMLSpanElement>(null)

    const x = useMotionValue(0)
    const springX = useSpring(x, { stiffness: 120, damping: 16, mass: 0.6 })
    const translateX = useTransform(springX, [0, 1], [-50, 50])

    const onMove = (e: React.MouseEvent) => {
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / Math.max(1, rect.width)
        x.set(Math.max(0, Math.min(1, ratio)))
    }

    const imgSrc =
        imageMode === "custom" ? customImage?.src : originalImage(link)
    const imgSrcSet = imageMode === "custom" ? customImage?.srcSet : undefined

    return (
        <span
            ref={containerRef}
            style={{
                position: "relative",
                display: "inline-block",
                width: "auto",
                ...font,
            }}
            onMouseEnter={isStatic ? undefined : () => setHovered(true)}
            onMouseLeave={isStatic ? undefined : () => setHovered(false)}
            onMouseMove={isStatic ? undefined : onMove}
        >
            <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{
                    color: textColor,
                    textDecoration: "underline",
                    textDecorationColor: underlineColor,
                    textUnderlineOffset: "0.18em",
                    textDecorationThickness: "1.5px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    ...font,
                }}
            >
                {title}
            </a>

            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 22,
                        }}
                        style={{
                            position: "absolute",
                            left: "50%",
                            bottom: "calc(100% + 14px)",
                            x: translateX,
                            marginLeft: -previewWidth / 2,
                            width: previewWidth,
                            height: previewHeight,
                            borderRadius: radius,
                            overflow: "hidden",
                            background: "#fff",
                            boxShadow: shadow
                                ? `0 18px 40px ${shadowColor}, 0 2px 8px ${shadowColor}`
                                : "none",
                            border: "1px solid rgba(0,0,0,0.06)",
                            pointerEvents: "none",
                            zIndex: 10,
                        }}
                    >
                        <img
                            src={imgSrc}
                            srcSet={imgSrcSet}
                            alt={title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                            }}
                            draggable={false}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    )
}

const COMPONENT_DEFAULTS = {
    title: "framer.com",
    link: "https://framer.com",
    imageMode: "original",
    previewWidth: 280,
    previewHeight: 174,
    radius: 14,
    shadow: true,
    shadowColor: "rgba(0,0,0,0.30)",
    textColor: "#111111",
    underlineColor: "rgba(17,17,17,0.35)",
    font: {
        fontFamily: "Inter",
        variant: "Bold",
        fontSize: "44px",
        letterSpacing: "-0.02em",
        lineHeight: "1.2em",
    } as any,
}

const __presetProps = {
  "title": "Follow Us",
  "link": "",
  "imageMode": "custom",
  "customImage": {
    "alt": "",
    "src": "blob:http://localhost/0558b6a1-4c41-4554-beaf-d17bf860afcf"
  },
  "previewWidth": 92,
  "previewHeight": 92,
  "radius": 10,
  "shadow": true,
  "shadowColor": "#8181814D",
  "textColor": "#FFFFFF",
  "underlineColor": "#FFFFFFF0",
  "font": {
    "variant": "Medium",
    "fontSize": "44px",
    "textAlign": "left",
    "fontFamily": "Josefin Sans",
    "fontWeight": 500,
    "lineHeight": "1.2em",
    "letterSpacing": "-0.02em"
  }
};

export default function LinkPreview(props: Record<string, unknown>) {
  return <__BaseImpl_LinkPreview {...(__presetProps as Record<string, unknown>)} {...props} />;
}
