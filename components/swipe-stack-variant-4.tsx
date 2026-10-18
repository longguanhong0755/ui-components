import React, { useState } from "react"
import { motion } from "framer-motion"
const RenderTarget = {
    current: () => "preview",
    canvas: "canvas",
    export: "export",
    thumbnail: "thumbnail",
    preview: "preview",
}

// Fixed (formerly controls):
const PERSPECTIVE = 1000 // px
const DEPTH_SPACING = 10 // px

// Shown when the user hasn't added their own Content images.
const DEFAULT_IMAGES = [
    {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/eec164e9-23f8-4f87-b48a-a208fa806100/w=800",
    },
    {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/859c75ea-953e-489e-be61-91a03a35d700/w=800",
    },
    {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/933a7615-f4b6-4eae-8ed1-705fa0e24400/w=800",
    },
    {
        src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/7d4d2641-d6a8-4fef-e85c-b12ed100d500/w=800",
    },
]

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
function __BaseImpl_CardStack(__props) {
    const {
        images = DEFAULT_IMAGES,
        cardWidth = 300,
        cardHeight = 400,
        cardRadius = 4,
        swipeThreshold = 50,
        tiltAngle = -45,
        tiltAngleStart = 0,
        xOffset = 200,
        transition = { type: "spring", stiffness: 300, damping: 30 },
        style,
    } = { ...COMPONENT_DEFAULTS, ...__props }
    const imgs =
        Array.isArray(images) && images.length > 0 ? images : DEFAULT_IMAGES
    const actualCardCount = imgs.length > 0 ? imgs.length : 3

    const [cards, setCards] = useState(() =>
        Array.from({ length: actualCardCount }, (_, i) => ({
            id: i + 1,
            content: `Card ${i + 1}`,
            imageIndex: i,
        }))
    )

    const [isPressed, setIsPressed] = useState(false)
    const [shouldReturnToCenter, setShouldReturnToCenter] = useState(false)

    React.useEffect(() => {
        setCards((prevCards) => {
            if (prevCards.length !== actualCardCount) {
                return Array.from({ length: actualCardCount }, (_, i) => ({
                    id: i + 1,
                    content: `Card ${i + 1}`,
                    imageIndex: i,
                }))
            }
            return prevCards
        })
    }, [actualCardCount])

    const handlePointerDown = () => setIsPressed(true)
    const handlePointerUp = () => setIsPressed(false)

    const handleDragEnd = (info) => {
        setIsPressed(false)
        const { offset } = info
        const distance = Math.sqrt(offset.x * offset.x + offset.y * offset.y)
        if (distance > swipeThreshold) {
            setCards((prevCards) => {
                const [topCard, ...restCards] = prevCards
                return [...restCards, topCard]
            })
        } else {
            setShouldReturnToCenter(true)
            setTimeout(() => setShouldReturnToCenter(false), 1000)
        }
    }

    const getCardStyle = (index) => {
        const totalCards = cards.length
        const stackOffset = index * 8
        const scaleValue = 1 - index * 0.05
        const rotationValue =
            totalCards > 1
                ? tiltAngleStart +
                  (index / (totalCards - 1)) * (tiltAngle - tiltAngleStart)
                : tiltAngleStart
        const xOffsetValue =
            totalCards > 1 ? (index / (totalCards - 1)) * xOffset : 0
        const depthOffset = index * DEPTH_SPACING
        const isTopCard = index === 0
        const shouldReturn = isTopCard && shouldReturnToCenter

        return {
            zIndex: cards.length - index,
            scale: scaleValue,
            x: shouldReturn ? 0 : xOffsetValue,
            y: shouldReturn ? 0 : -stackOffset,
            rotate: shouldReturn ? 0 : rotationValue,
            z: -depthOffset,
            opacity: 1,
        }
    }

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    // Radius slider 0–20 → 0 (boxy) up to half the smaller side (fully rounded).
    const radiusPx = (cardRadius / 20) * (Math.min(cardWidth, cardHeight) / 2)

    return (
        <div
            style={{
                ...style,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                perspective: `${PERSPECTIVE}px`,
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: cardWidth,
                    height: cardHeight,
                }}
            >
                {cards.map((card, index) => {
                    const isTopCard = index === 0
                    const cardStyle = getCardStyle(index)
                    const cardImage: any = imgs[card.imageIndex]

                    return (
                        <motion.div
                            key={card.id}
                            drag={isTopCard && !isCanvas ? true : false}
                            dragConstraints={{
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                            }}
                            dragElastic={0.7}
                            dragMomentum={false}
                            dragTransition={{
                                bounceStiffness: 300,
                                bounceDamping: 20,
                            }}
                            onMouseDown={
                                isTopCard && !isCanvas
                                    ? handlePointerDown
                                    : undefined
                            }
                            onMouseUp={
                                isTopCard && !isCanvas
                                    ? handlePointerUp
                                    : undefined
                            }
                            onDragEnd={
                                isTopCard && !isCanvas
                                    ? (_: any, info: any) => handleDragEnd(info)
                                    : undefined
                            }
                            animate={cardStyle}
                            transition={{
                                x: isCanvas ? { duration: 0 } : transition,
                                y: isCanvas ? { duration: 0 } : transition,
                                rotate: isCanvas ? { duration: 0 } : transition,
                                scale: isCanvas ? { duration: 0 } : transition,
                                zIndex: { duration: 0.3, ease: "easeOut" },
                                z: { duration: 0.3, ease: "easeOut" },
                            }}
                            initial={isCanvas ? cardStyle : false}
                            whileDrag={{
                                scale: 1.05,
                                rotate: tiltAngleStart,
                                zIndex: 1000,
                            }}
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                backgroundColor: cardImage
                                    ? "transparent"
                                    : "rgba(243, 239, 255, 0.8)",
                                borderRadius: radiusPx,
                                display: "flex",
                                alignItems: "center",
                                backdropFilter: cardImage
                                    ? "none"
                                    : "blur(10px)",
                                justifyContent: "center",
                                fontSize: "32px",
                                fontWeight: "300",
                                fontFamily: "system-ui",
                                color: "#9967FF",
                                cursor:
                                    isTopCard && !isCanvas
                                        ? isPressed
                                            ? "grabbing"
                                            : "grab"
                                        : "default",
                                userSelect: "none",
                                backgroundImage: cardImage
                                    ? `url(${cardImage.src})`
                                    : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                overflow: "hidden",
                                border: cardImage
                                    ? "none"
                                    : "1.5px solid #9967FF",
                            }}
                        >
                            {!cardImage && (
                                <p
                                    style={{
                                        fontSize: 14,
                                        color: "#9967FF",
                                        padding: 20,
                                        textAlign: "center",
                                    }}
                                >
                                    {card.content} — Add images in Content
                                </p>
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    images: DEFAULT_IMAGES,
    cardWidth: 300,
    cardHeight: 400,
    cardRadius: 4,
    swipeThreshold: 50,
    tiltAngleStart: 0,
    tiltAngle: -45,
    xOffset: 200,
    transition: { type: "spring", stiffness: 300, damping: 30 },
}

CardStack.displayName = "Swipe Card Stack"

const __presetProps = {
  "images": [
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/eec164e9-23f8-4f87-b48a-a208fa806100/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/859c75ea-953e-489e-be61-91a03a35d700/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/933a7615-f4b6-4eae-8ed1-705fa0e24400/w=800"
    },
    {
      "src": "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/7d4d2641-d6a8-4fef-e85c-b12ed100d500/w=800"
    }
  ],
  "xOffset": 110,
  "cardWidth": 300,
  "tiltAngle": -25.5,
  "cardHeight": 400,
  "cardRadius": 4,
  "transition": {
    "mass": 1,
    "type": "spring",
    "damping": 30,
    "stiffness": 300
  },
  "swipeThreshold": 50,
  "tiltAngleStart": 0
};

export default function CardStack(props: Record<string, unknown>) {
  return <__BaseImpl_CardStack {...(__presetProps as Record<string, unknown>)} {...props} />;
}
