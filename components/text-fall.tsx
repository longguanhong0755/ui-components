"use client"

import * as React from "react"
import { useLayoutEffect, useRef } from "react"

const LOGO_SVG_DESKTOP = `<svg width="1766" height="204" viewBox="0 0 1766 204" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22.9606 89.0666C26.5105 80.4877 30.0604 73.9341 33.6103 69.474C37.1601 64.9911 42.1892 61.6233 48.7428 59.3932C55.2737 57.1632 64.4215 56.0254 76.1861 56.0254V78.9859C73.9561 78.8038 70.8613 78.7128 66.9473 78.7128C50.3357 78.7128 38.753 82.5813 32.2222 90.341C25.6913 98.0779 22.4145 110.821 22.4145 128.57V201.662H0.00012207V58.2554H22.4145V69.4512C22.4145 75.0491 21.4815 80.647 19.6155 86.2449C19.0466 87.7468 18.7736 88.9073 18.7736 89.7493C18.7736 90.5913 19.2287 91.0919 20.1844 91.2967H20.4575C21.3905 91.2967 22.2324 90.5458 22.9834 89.0666H22.9606Z" fill="white"/>
<path d="M103.567 135.554C103.931 144.133 106.047 152.12 109.87 159.493C113.693 166.866 119.063 172.759 125.981 177.128C132.899 181.52 140.909 183.705 150.056 183.705C167.783 183.705 179.639 173.988 185.624 154.578H209.153C207.287 162.974 203.828 170.916 198.799 178.38C193.747 185.844 187.034 191.965 178.638 196.721C170.241 201.477 160.433 203.866 149.237 203.866C135.242 203.866 123.136 200.499 112.965 193.786C102.793 187.073 95.0332 178.107 89.7311 166.911C84.4063 155.715 81.7439 143.382 81.7439 129.933C81.7439 115.37 84.5428 102.49 90.1407 91.2941C95.7386 80.0983 103.635 71.4056 113.807 65.2388C123.978 59.072 135.607 56 148.668 56C159.5 56 169.717 58.4804 179.343 63.4184C188.969 68.3563 196.751 76.0705 202.736 86.5154C208.721 96.9602 211.702 110.045 211.702 125.723C211.702 128.909 211.519 132.163 211.133 135.531H103.589L103.567 135.554ZM104.682 117.622H189.264C188.331 104.356 184.417 93.9565 177.5 86.4016C170.582 78.8467 161.525 75.0693 150.33 75.0693C135.948 75.0693 125.162 78.9377 117.994 86.6974C110.803 94.4343 106.366 104.765 104.682 117.645V117.622Z" fill="white"/>
<path d="M278.462 181.91C279.031 183.685 279.304 185.415 279.304 187.099C279.304 189.329 280.055 190.466 281.534 190.466C283.014 190.466 283.765 189.351 283.765 187.099C283.765 185.415 284.038 183.685 284.607 181.91C285.175 180.135 285.54 178.975 285.722 178.406L326.34 58.2559H350.985L299.466 201.639H263.626L212.107 58.2559H236.751L277.37 178.406C277.552 178.975 277.939 180.135 278.485 181.91H278.462Z" fill="white"/>
<path d="M372.489 135.554C372.854 144.133 374.97 152.12 378.793 159.493C382.616 166.866 387.986 172.759 394.904 177.128C401.822 181.52 409.831 183.705 418.979 183.705C436.706 183.705 448.562 173.988 454.546 154.578H478.076C476.21 162.974 472.751 170.916 467.722 178.38C462.67 185.844 455.957 191.965 447.56 196.721C439.164 201.477 429.356 203.866 418.16 203.866C404.165 203.866 392.059 200.499 381.888 193.786C371.716 187.073 363.956 178.107 358.654 166.911C353.329 155.715 350.667 143.382 350.667 129.933C350.667 115.37 353.466 102.49 359.064 91.2941C364.661 80.0983 372.558 71.4056 382.729 65.2388C392.901 59.072 404.529 56 417.591 56C428.423 56 438.64 58.4804 448.266 63.4184C457.892 68.3563 465.674 76.0705 471.659 86.5154C477.643 96.9602 480.624 110.045 480.624 125.723C480.624 128.909 480.442 132.163 480.055 135.531H372.512L372.489 135.554ZM373.604 117.622H458.187C457.254 104.356 453.34 93.9565 446.423 86.4016C439.505 78.8467 430.448 75.0693 419.252 75.0693C404.871 75.0693 394.085 78.9377 386.917 86.6974C379.726 94.4343 375.288 104.765 373.604 117.645V117.622Z" fill="white"/>
<path d="M524.961 201.638H502.547V0H524.961V201.638Z" fill="white"/>
<path d="M611.107 117.053C624.374 116.303 634.068 115.051 640.235 113.276C646.401 111.501 649.382 107.724 649.2 101.944C649.018 94.6619 646.174 88.3586 640.667 83.0337C635.16 77.7089 625.125 75.0465 610.561 75.0465C598.797 75.0465 589.785 77.5269 583.527 82.4649C577.27 87.4028 573.583 93.5241 572.468 100.806H550.623C553.058 85.6734 559.907 74.4321 571.217 67.0593C582.504 59.6864 596.384 56 612.814 56C631.292 56 645.719 60.5739 656.073 69.7217C666.426 78.8695 671.615 95.5721 671.615 119.852V201.636H649.2V185.685C649.2 180.838 650.133 175.604 651.999 170.006C652.568 168.891 652.841 167.776 652.841 166.638C652.841 165.5 652.386 164.863 651.43 164.681H650.862C649.747 164.681 648.996 165.523 648.631 167.207C644.9 178.608 638.027 187.551 628.038 194.081C618.048 200.612 606.42 203.889 593.176 203.889C584.779 203.889 576.974 202.069 569.783 198.428C562.592 194.787 556.858 189.735 552.557 183.295C548.256 176.855 546.117 169.619 546.117 161.586C546.117 135.44 562.911 120.876 596.521 117.895L611.085 117.053H611.107ZM609.696 134.143L597.09 136.1C587.76 137.602 580.66 140.196 575.813 143.951C570.966 147.683 568.531 153.098 568.531 160.198C568.531 167.298 571.012 172.987 575.95 177.834C580.888 182.681 588.033 185.116 597.363 185.116C612.678 185.116 625.079 179.654 634.614 168.732C644.126 157.809 648.996 142.085 649.178 121.536C646.197 125.086 641.668 127.658 635.592 129.228C629.517 130.821 620.892 132.459 609.696 134.12V134.143Z" fill="white"/>
<path d="M732.58 161.311C732.58 169.526 733.832 175.124 736.358 178.105C738.884 181.086 743.958 182.588 751.627 182.588H772.904V201.634H751.627C741.364 201.634 733.286 200.428 727.392 197.993C721.521 195.559 717.175 191.326 714.376 185.25C711.577 179.174 710.166 170.641 710.166 159.627V77.2973H683.292V58.2508H710.166V17.9277H732.58V58.2508H772.904V77.2973H732.58V161.311Z" fill="white"/>
<path d="M815.722 0V29.1273H791.078V0H815.722ZM814.607 58.2545V201.638H792.193V58.2545H814.607Z" fill="white"/>
<path d="M961.788 92.571C967.204 103.858 969.912 116.328 969.912 129.959C969.912 143.589 967.204 156.059 961.788 167.346C956.372 178.633 948.59 187.553 938.395 194.084C928.224 200.615 916.322 203.892 902.692 203.892C889.061 203.892 877.16 200.615 866.988 194.084C856.816 187.553 849.011 178.633 843.595 167.346C838.179 156.059 835.471 143.589 835.471 129.959C835.471 116.328 838.179 103.858 843.595 92.571C849.011 81.2842 856.794 72.364 866.988 65.8331C877.16 59.3022 889.061 56.0254 902.692 56.0254C916.322 56.0254 928.224 59.3022 938.395 65.8331C948.567 72.364 956.372 81.2842 961.788 92.571ZM947.498 129.959C947.498 114.644 943.493 101.855 935.46 91.5925C927.427 81.3297 916.504 76.1869 902.692 76.1869C888.879 76.1869 877.956 81.3297 869.924 91.5925C861.891 101.855 857.886 114.644 857.886 129.959C857.886 145.273 861.891 158.062 869.924 168.325C877.956 178.587 888.879 183.73 902.692 183.73C916.504 183.73 927.427 178.587 935.46 168.325C943.493 158.062 947.498 145.273 947.498 129.959Z" fill="white"/>
<path d="M1103.92 184.843C1112.7 184.843 1119.87 183.591 1125.49 181.065C1131.09 178.539 1135.12 175.513 1137.53 171.963C1139.96 168.413 1141.17 164.863 1141.17 161.313C1141.17 156.466 1139.83 152.621 1137.12 149.822C1134.41 147.023 1129.7 144.679 1122.97 142.813C1116.25 140.947 1106.44 139.263 1093.57 137.761C1078.64 136.077 1067.1 131.822 1058.98 125.018C1050.85 118.214 1046.8 109.931 1046.8 100.237C1046.8 92.7732 1049.03 85.6734 1053.52 78.9605C1058 72.2476 1064.53 66.7407 1073.11 62.4399C1081.69 58.139 1091.88 56 1103.62 56C1120.62 56 1133.91 60.3463 1143.54 69.0162C1153.16 77.7089 1158.42 89.0412 1159.35 103.036H1137.23C1136.66 95.0032 1133.77 88.3358 1128.54 83.011C1123.31 77.6862 1114.73 75.0237 1102.78 75.0237C1090.83 75.0237 1082.94 77.3221 1077.43 81.8732C1071.92 86.4471 1069.17 91.6354 1069.17 97.4153C1069.17 100.783 1070.01 103.764 1071.7 106.381C1073.38 108.998 1077.07 111.478 1082.76 113.799C1088.45 116.143 1097 117.964 1108.38 119.261C1126.31 121.491 1139.99 125.61 1149.41 131.594C1158.83 137.579 1163.54 146.067 1163.54 157.081C1163.54 171.644 1158.08 183.068 1147.15 191.396C1136.23 199.725 1121.44 203.866 1102.76 203.866C1084.08 203.866 1070.04 199.247 1059.5 190.008C1048.96 180.769 1043.3 168.208 1042.55 152.348H1064.39C1064.57 161.313 1067.85 168.959 1074.2 175.308C1080.55 181.657 1090.45 184.82 1103.9 184.82L1103.92 184.843Z" fill="white"/>
<path d="M1218.69 161.311C1218.69 169.526 1219.94 175.124 1222.46 178.105C1224.99 181.086 1230.06 182.588 1237.73 182.588H1259.01V201.634H1237.73C1227.47 201.634 1219.39 200.428 1213.5 197.993C1207.63 195.559 1203.28 191.326 1200.48 185.25C1197.68 179.174 1196.27 170.641 1196.27 159.627V77.2973H1169.38V58.2508H1196.27V17.9277H1218.69V58.2508H1259.01V77.2973H1218.69V161.311Z" fill="white"/>
<path d="M1276.27 143.389V58.2598H1298.69V142.274C1298.69 157.952 1301.76 168.966 1307.93 175.315C1314.09 181.664 1322.67 184.827 1333.69 184.827C1341.15 184.827 1348.39 182.529 1355.39 177.977C1362.4 173.403 1368.14 166.918 1372.62 158.521C1377.1 150.124 1379.33 140.499 1379.33 129.667V58.2598H1401.75V201.643H1379.33V189.606C1379.33 184.19 1380.27 179.047 1382.13 174.2C1382.31 173.836 1382.61 173.176 1382.97 172.243C1383.34 171.31 1383.5 170.514 1383.38 169.854C1383.29 169.194 1382.86 168.784 1382.13 168.602H1381.56C1380.27 168.602 1379.42 169.262 1379.04 170.559C1377.35 175.611 1374.19 180.685 1369.53 185.828C1364.86 190.971 1359.04 195.249 1352.03 198.708C1345.02 202.167 1337.51 203.896 1329.48 203.896C1312.48 203.896 1299.37 198.958 1290.13 189.059C1280.89 179.161 1276.27 163.937 1276.27 143.412V143.389Z" fill="white"/>
<path d="M1535.4 201.638V189.304C1535.4 184.458 1536.33 179.497 1538.2 174.468C1538.77 172.966 1539.08 171.805 1539.18 170.963C1539.27 170.121 1538.95 169.507 1538.2 169.143L1537.36 168.87C1536.24 168.87 1535.4 169.712 1534.83 171.396C1531.46 181.477 1525.45 189.418 1516.76 195.198C1508.07 200.978 1498.03 203.891 1486.66 203.891C1474.53 203.891 1463.65 200.705 1454.02 194.379C1444.4 188.03 1436.89 179.201 1431.47 167.914C1426.06 156.627 1423.35 143.975 1423.35 129.958C1423.35 115.94 1426.06 103.311 1431.47 92.0012C1436.89 80.7144 1444.4 71.8852 1454.02 65.5364C1463.65 59.1875 1474.5 56.0245 1486.66 56.0245C1498.03 56.0245 1508.14 58.9145 1516.9 64.7171C1525.68 70.4971 1531.64 78.2568 1534.83 87.9507C1535.58 90.1808 1536.6 91.1365 1537.9 90.7496C1538.83 90.5676 1539.31 89.9987 1539.31 89.0657C1539.31 88.4968 1538.86 87.1087 1537.9 84.8559C1536.22 80.009 1535.38 74.8662 1535.38 69.4503V0H1557.79V201.638H1535.38H1535.4ZM1529.5 156.832C1533.42 148.617 1535.38 139.652 1535.38 129.958C1535.38 120.264 1533.42 111.298 1529.5 103.083C1525.59 94.8684 1520.17 88.3375 1513.26 83.4906C1506.34 78.6436 1498.6 76.2088 1490.02 76.2088C1476.03 76.2088 1465.15 81.3515 1457.39 91.6144C1449.63 101.877 1445.76 114.666 1445.76 129.98C1445.76 145.295 1449.63 158.084 1457.39 168.347C1465.13 178.609 1476.01 183.752 1490.02 183.752C1498.6 183.752 1506.36 181.317 1513.26 176.47C1520.15 171.623 1525.59 165.092 1529.5 156.878V156.832Z" fill="white"/>
<path d="M1610.96 0V29.1273H1586.32V0H1610.96ZM1609.85 58.2545V201.638H1587.43V58.2545H1609.85Z" fill="white"/>
<path d="M1757.03 92.571C1762.45 103.858 1765.15 116.328 1765.15 129.959C1765.15 143.589 1762.45 156.059 1757.03 167.346C1751.61 178.633 1743.83 187.553 1733.64 194.084C1723.47 200.615 1711.56 203.892 1697.93 203.892C1684.3 203.892 1672.4 200.615 1662.23 194.084C1652.06 187.553 1644.25 178.633 1638.84 167.346C1633.42 156.059 1630.71 143.589 1630.71 129.959C1630.71 116.328 1633.42 103.858 1638.84 92.571C1644.25 81.2842 1652.04 72.364 1662.23 65.8331C1672.4 59.3022 1684.3 56.0254 1697.93 56.0254C1711.56 56.0254 1723.47 59.3022 1733.64 65.8331C1743.81 72.364 1751.61 81.2842 1757.03 92.571ZM1742.76 129.959C1742.76 114.644 1738.76 101.855 1730.72 91.5925C1722.69 81.3297 1711.77 76.1869 1697.96 76.1869C1684.14 76.1869 1673.22 81.3297 1665.19 91.5925C1657.16 101.855 1653.15 114.644 1653.15 129.959C1653.15 145.273 1657.16 158.062 1665.19 168.325C1673.22 178.587 1684.14 183.73 1697.96 183.73C1711.77 183.73 1722.69 178.587 1730.72 168.325C1738.76 158.062 1742.76 145.273 1742.76 129.959Z" fill="white"/>
</svg>`

const LOGO_SVG_MOBILE = `<svg width="273" height="269" viewBox="0 0 273 269" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M208.116 145.061L200.719 140.721C198.396 139.345 197.969 136.166 199.894 134.241L207.872 126.263C242.196 91.9391 242.44 36.4639 208.636 1.83389C207.474 0.641862 205.885 0 204.234 0H4.12626C1.83389 0 0 1.83389 0 4.12625V75.4341C0 77.7264 1.83389 79.5603 4.12626 79.5603H127.303L2.90366 203.929C1.28372 205.549 1.28372 208.147 2.90366 209.767L60.7018 267.565C62.3217 269.185 64.9197 269.185 66.5397 267.565L183.878 150.226C186.476 147.628 190.908 149.462 190.908 153.13V264.264C190.908 266.556 192.742 268.39 195.034 268.39H268.145C270.438 268.39 272.272 266.556 272.272 264.264V257.02C272.272 210.928 247.85 168.321 208.116 145V145.061Z" fill="white"/>
</svg>`

// #region engine — plain DOM/canvas, no React, no framer imports. Extracted
// verbatim by the headless probe in the scratchpad, so keep it self-contained.

const CHARS = "01#@&ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Mask is always rescaled to fit, so its own font size only sets edge quality. */
const MASK_FONT_PX = 200
/**
 * The Font control was cut from the panel — the mask is always rescaled to fit,
 * so family and weight only ever nudged the silhouette the glyph grid samples,
 * which the grid itself then quantises away. These are its former defaults; the
 * render path is unchanged.
 */
const MASK_FONT_FAMILY = "'Helvetica Neue', Arial, sans-serif"
const MASK_FONT_WEIGHT = 800
/**
 * Idle Mode was cut. It only chose the resting state before the first trigger,
 * which Auto Fall hides anyway, and its two loose settings duplicated Scatter.
 * The field rests assembled — the shipped default.
 */
/** Cursor > Damping was cut: % of the gap recovered per frame at 60fps. */
const CURSOR_DAMPING = 16
/** Fall and Form were two ms timers; Speed drives both. 50 == this value. */
const BASE_PHASE_MS = 1000
/** Hard ceiling on live glyphs. Past this the sample step widens instead. */
const MAX_PARTICLES = 4200
/** Most lines the wrapper will break the text onto. */
const MAX_LINES = 6
/**
 * Per-extra-line handicap on the wrap search. Maximising fitted scale alone
 * stacks lines for a rounding error: on a 1920x900 frame four lines measured
 * only 3.8% larger than two, and read far worse. At 0.94 the wrap only breaks
 * when it wins more than that, which leaves phones on five lines and wide
 * frames on one or two.
 */
const LINE_PENALTY = 0.94

type Align = "left" | "center"

type EngineParams = {
    text: string
    glyphFamily: string
    color: string
    align: Align
    autoFall: boolean
    /** On-screen cell / glyph size, CSS px. */
    glyphSize: number
    /** Text block span, % of the frame's short side. */
    textSize: number
    /** 0–100. 50 is the fall/reform pace the component shipped at. */
    speed: number
    /** 0–100. 50 is the rate the component shipped at. */
    gravity: number
    /** Idle spread, % of half the canvas short side. */
    scatter: number
    /** Pointer push, % of one cell. */
    strength: number
    /** Pointer radius, % of half the canvas short side. */
    reach: number
}

type Particle = {
    char: string
    x: number
    y: number
    vx: number
    vy: number
    hx: number
    hy: number
    tx: number
    ty: number
    fx: number
    fy: number
    sx: number
    sy: number
    delay: number
    done: boolean
}

/**
 * Worst deviation of any target from the sample lattice, in units of one
 * spacing. 0 is a clean lattice; a second grid rounding the targets pushes this
 * toward 0.5 and is what drops whole rows out of the field.
 */
function latticeError(values: number[], unit: number) {
    if (!values.length || !(unit > 0)) return 0
    let min = Infinity
    for (const v of values) if (v < min) min = v
    let worst = 0
    for (const v of values) {
        const k = (v - min) / unit
        worst = Math.max(worst, Math.abs(k - Math.round(k)))
    }
    return worst
}

type Stats = {
    bufferW: number
    bufferH: number
    dpr: number
    maskW: number
    maskH: number
    lines: number
    dispScale: number
    stepMask: number
    /** Cell / glyph size in DEVICE px. */
    cellDevice: number
    /** Cell / glyph size in CSS px — this is what must hold across viewports. */
    cellCss: number
    particles: number
    drawnCssW: number
    drawnCssH: number
    /** Worst off-lattice error, in spacings. 0 is clean, 0.5 is worst case. */
    latticeErrX: number
    latticeErrY: number
    phase: string
}

function createTextFall(
    root: HTMLElement,
    canvas: HTMLCanvasElement,
    params: EngineParams
) {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
    const mouse = { x: 0, y: 0, active: false }

    let particles: Particle[] = []
    let dpr = 1
    let cellDevice = 10
    let stepMask = 1
    let dispScale = 1
    let maskW = 1
    let maskH = 1
    let maskLines = 1
    let phase: "idle" | "fall" | "form" | "spread" | "done" = "idle"
    let fallStart = 0
    let formStart = 0
    let spreadStart = 0
    let lastTime = 0
    let floorY = 0
    let rafId = 0
    let visible = true
    let resizeTimer = 0
    let lastCssW = -1
    let lastCssH = -1
    let mask: HTMLCanvasElement | HTMLImageElement | null = null
    let logoMode: "mobile" | "desktop" | null = null
    let cachedMaskKey: string | null = null
    let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    let fitBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    let scrollRevealDone = false
    let destroyed = false

    const mobileMq = window.matchMedia("(max-width: 767px)")

    function currentLogoMode(): "mobile" | "desktop" {
        return mobileMq.matches ? "mobile" : "desktop"
    }

    function svgToImage(markup: string): Promise<HTMLImageElement> {
        const blob = new Blob([markup.trim()], {
            type: "image/svg+xml;charset=utf-8",
        })
        const url = URL.createObjectURL(blob)
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                URL.revokeObjectURL(url)
                resolve(img)
            }
            img.onerror = reject
            img.src = url
        })
    }

    /**
     * Break `words` onto exactly `count` lines, each as close to the mean line
     * width as the word boundaries allow.
     */
    function wrapInto(
        words: string[],
        count: number,
        measure: CanvasRenderingContext2D
    ): string[] {
        const widths = words.map((w) => measure.measureText(w).width)
        const spaceW = measure.measureText(" ").width
        let total = spaceW * Math.max(0, words.length - 1)
        for (const w of widths) total += w
        const target = total / count

        const lines: string[] = []
        let cur: string[] = []
        let curW = 0
        for (let i = 0; i < words.length; i++) {
            const add = (cur.length ? spaceW : 0) + widths[i]
            const roomLeft = count - lines.length - 1
            const wordsLeft = words.length - i
            const mustBreak = cur.length > 0 && curW + add > target && roomLeft > 0
            const mustFill = wordsLeft <= roomLeft && cur.length > 0
            if (mustBreak || mustFill) {
                lines.push(cur.join(" "))
                cur = [words[i]]
                curW = widths[i]
            } else {
                cur.push(words[i])
                curW += add
            }
        }
        if (cur.length) lines.push(cur.join(" "))
        return lines
    }

    /**
     * Pick the line count that maximises the fitted scale. Scale is
     * `min(fitW / maskW, fitH / maskH)`, so this directly maximises how big the
     * text renders — a phone-shaped box picks more lines, a banner picks one.
     * This is the fix for the old build always being width-bound.
     */
    function buildTextMask(value: string, fitW: number, fitH: number) {
        const measure = document
            .createElement("canvas")
            .getContext("2d") as CanvasRenderingContext2D
        const fontSpec = `${MASK_FONT_WEIGHT} ${MASK_FONT_PX}px ${MASK_FONT_FAMILY}`
        measure.font = fontSpec

        const hardLines = value.split(/\n/).map((s) => s.trim()).filter(Boolean)
        const lineHeight = MASK_FONT_PX * 1.16
        const padX = MASK_FONT_PX * 0.16
        const padY = MASK_FONT_PX * 0.16

        let best: {
            lines: string[]
            w: number
            h: number
            scale: number
            score: number
        } | null = null

        const candidates: string[][] = []
        if (hardLines.length > 1) {
            candidates.push(hardLines)
        } else {
            const words = (hardLines[0] || "").split(/\s+/).filter(Boolean)
            const maxLines = Math.max(1, Math.min(MAX_LINES, words.length))
            for (let n = 1; n <= maxLines; n++) {
                const lines = wrapInto(words, n, measure)
                if (lines.length === n) candidates.push(lines)
            }
        }

        for (const lines of candidates) {
            let w = 1
            for (const s of lines) w = Math.max(w, measure.measureText(s).width)
            const boxW = w + padX * 2
            const boxH = lineHeight * lines.length + padY * 2
            const scale = Math.min(fitW / boxW, fitH / boxH)
            const score = scale * Math.pow(LINE_PENALTY, lines.length - 1)
            if (!best || score > best.score)
                best = { lines, w: boxW, h: boxH, scale, score }
        }
        if (!best) best = { lines: [value], w: 1, h: 1, scale: 1, score: 1 }

        const w = Math.max(1, Math.min(4000, Math.ceil(best.w)))
        const h = Math.max(1, Math.min(4000, Math.ceil(best.h)))
        const out = document.createElement("canvas")
        out.width = w
        out.height = h
        const mctx = out.getContext("2d") as CanvasRenderingContext2D
        // Background stays fully transparent — sampleTargets() reads alpha as
        // the mask, so a filled background would make every cell "inside".
        mctx.fillStyle = "#fff"
        mctx.textBaseline = "middle"
        mctx.font = fontSpec
        mctx.textAlign = params.align === "left" ? "left" : "center"
        const ax = params.align === "left" ? padX : w / 2
        for (let i = 0; i < best.lines.length; i++) {
            mctx.fillText(best.lines[i], ax, padY + lineHeight * (i + 0.5))
        }
        maskLines = best.lines.length
        return out
    }

    async function ensureMask() {
        const mode = currentLogoMode()
        const trimmed = typeof params.text === "string" ? params.text.trim() : ""
        const fitW = fitBox.maxX - fitBox.minX
        const fitH = fitBox.maxY - fitBox.minY
        // Fit box is part of the key: the wrap depends on the box aspect, so a
        // resize past a line-count boundary has to rebuild the mask.
        const key = trimmed
            ? `t:${trimmed}|${params.align}|${Math.round(fitW)}x${Math.round(fitH)}`
            : `logo:${mode}`

        if (mask && cachedMaskKey === key) return mask
        logoMode = mode
        cachedMaskKey = key

        if (trimmed) {
            mask = buildTextMask(trimmed, Math.max(1, fitW), Math.max(1, fitH))
        } else {
            maskLines = 1
            mask = await svgToImage(
                mode === "mobile" ? LOGO_SVG_MOBILE : LOGO_SVG_DESKTOP
            )
        }
        return mask
    }

    function randChar() {
        return CHARS[Math.floor(Math.random() * CHARS.length)]
    }

    /**
     * Speed -> phase length. Exponential so the dial is symmetric about its
     * shipped value: 50 is 1000ms, 100 a quarter of that, 0 four times it.
     */
    function phaseMs() {
        const k = Math.pow(2, (50 - params.speed) / 25)
        return Math.min(6000, Math.max(150, BASE_PHASE_MS * k))
    }

    /**
     * Everything here keys off `cellDevice`, which is known before the mask is
     * built (Size x dpr). That breaks the old chicken-and-egg where the fit box
     * was derived from a provisional glyph size and never recomputed, so the
     * mask was placed against stale bounds.
     */
    function updateBounds() {
        const W = canvas.width
        const H = canvas.height
        const edge = Math.ceil(cellDevice * 0.5)
        bounds.minX = edge
        bounds.minY = edge
        bounds.maxX = Math.max(edge + 1, W - edge - cellDevice * 0.7)
        bounds.maxY = Math.max(edge + 1, H - edge - cellDevice * 1.05)
        floorY = bounds.maxY

        // Size is a percent of the frame, not a px inset: a px padding would
        // eat a phone-width frame whole while barely showing on a desktop one.
        // A one-cell gutter is always reserved so edge glyphs cannot clip.
        const frac = Math.max(10, Math.min(100, params.textSize)) / 100
        const boxW = Math.min(W - cellDevice * 2, W * frac)
        const boxH = Math.min(H - cellDevice * 2, H * frac)
        fitBox.minX = (W - boxW) / 2
        fitBox.minY = (H - boxH) / 2
        fitBox.maxX = fitBox.minX + Math.max(1, boxW)
        fitBox.maxY = fitBox.minY + Math.max(1, boxH)
    }

    function clampParticle(p: Particle) {
        p.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.x))
        p.y = Math.max(bounds.minY, Math.min(bounds.maxY, p.y))
    }

    function resizeCanvas() {
        // offsetWidth/offsetHeight, never getBoundingClientRect: the rect
        // carries the Framer canvas zoom and the buffer would drift with it.
        const cssW = root.offsetWidth || 1
        const cssH = root.offsetHeight || 1
        lastCssW = cssW
        lastCssH = cssH
        dpr = Math.min(window.devicePixelRatio || 1, 2)
        const w = Math.max(1, Math.round(cssW * dpr))
        const h = Math.max(1, Math.round(cssH * dpr))
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
        }
        cellDevice = Math.max(3, Math.round(params.glyphSize * dpr))
        updateBounds()
    }

    async function sampleTargets() {
        const img = await ensureMask()
        if (destroyed || !img) return []

        const iw = (img as HTMLCanvasElement).width || 1
        const ih = (img as HTMLCanvasElement).height || 1
        maskW = iw
        maskH = ih

        const off = document.createElement("canvas")
        off.width = iw
        off.height = ih
        const octx = off.getContext("2d") as CanvasRenderingContext2D
        octx.drawImage(img, 0, 0, iw, ih)
        const data = octx.getImageData(0, 0, iw, ih).data

        const fitW = fitBox.maxX - fitBox.minX
        const fitH = fitBox.maxY - fitBox.minY
        dispScale = Math.min(fitW / iw, fitH / ih)

        // The step is derived from the on-screen cell, not the other way round.
        // That is what keeps glyph size constant in CSS px at every viewport.
        stepMask = Math.max(1, Math.round(cellDevice / dispScale))

        const collect = (step: number) => {
            const pts: { tx: number; ty: number }[] = []
            for (let y = 0; y < ih; y += step) {
                for (let x = 0; x < iw; x += step) {
                    if (data[(y * iw + x) * 4 + 3] > 50) pts.push({ tx: x, ty: y })
                }
            }
            return pts
        }

        let raw = collect(stepMask)
        if (raw.length > MAX_PARTICLES) {
            // Coarsen rather than let a phone draw 10k glyphs.
            stepMask = Math.ceil(stepMask * Math.sqrt(raw.length / MAX_PARTICLES))
            raw = collect(stepMask)
            cellDevice = Math.max(3, Math.round(stepMask * dispScale))
            updateBounds()
        }

        const dispW = iw * dispScale
        const dispH = ih * dispScale
        const ox =
            params.align === "left"
                ? fitBox.minX
                : fitBox.minX + (fitW - dispW) / 2
        const oy = fitBox.minY + (fitH - dispH) / 2

        // Exact lattice positions. These are already uniformly spaced by
        // `stepMask * dispScale`; rounding them onto a SECOND grid of
        // `cellDevice` (which is only within ~7% of that spacing) made the
        // drift skip a whole row every 1/(spacing/cell - 1) rows, which is the
        // empty line that appeared at some sizes and not others.
        return raw.map((p) => ({
            tx: ox + p.tx * dispScale,
            ty: oy + p.ty * dispScale,
        }))
    }

    /** Idle scatter radius in device px — a share of the canvas, not a px literal. */
    function scatterRadius() {
        return (
            (params.scatter / 100) *
            0.5 *
            Math.min(canvas.width, canvas.height)
        )
    }

    function computeNearPosition(t: { tx: number; ty: number }) {
        const jitter = scatterRadius()
        const angle = Math.random() * Math.PI * 2
        const maxDist = Math.min(
            jitter,
            t.tx - bounds.minX,
            bounds.maxX - t.tx,
            t.ty - bounds.minY,
            bounds.maxY - t.ty
        )
        const dist = Math.random() * Math.max(0, maxDist)
        return {
            x: t.tx + Math.cos(angle) * dist,
            y: t.ty + Math.sin(angle) * dist,
        }
    }

    function spawnParticles(targets: { tx: number; ty: number }[]): Particle[] {
        // Always the assembled resting state — see IDLE note above.
        return targets.map((t, i) => ({
            char: randChar(),
            x: t.tx,
            y: t.ty,
            vx: 0,
            vy: 0,
            hx: t.tx,
            hy: t.ty,
            tx: t.tx,
            ty: t.ty,
            fx: t.tx,
            fy: t.ty,
            sx: t.tx,
            sy: t.ty,
            delay: (i % 20) / 20,
            done: false,
        }))
    }

    function maybeScramble(p: Particle, ratePerSec = 0.9, dt = 0.016) {
        if (Math.random() < ratePerSec * dt) p.char = randChar()
    }

    function updateIdle(p: Particle, dt: number) {
        clampParticle(p)
        maybeScramble(p, 0.9, dt)
    }

    function applyMagnetic(p: Particle, dt: number) {
        if (params.strength > 0 && mouse.active) {
            const dx = mouse.x - p.x
            const dy = mouse.y - p.y
            const dist = Math.hypot(dx, dy) || 1
            const radius =
                (params.reach / 100) *
                0.5 *
                Math.min(canvas.width, canvas.height)
            if (radius > 0 && dist < radius) {
                const t = 1 - dist / radius
                // Push AWAY from the pointer — the original behaviour, kept.
                const force = t * t * (params.strength / 100) * cellDevice * 2
                p.x -= (dx / dist) * force
                p.y -= (dy / dist) * force
                if (t > 0.65 && Math.random() < 3.6 * dt) p.char = randChar()
            }
        }
        // Per-frame lerp made frame-rate independent.
        const k = 1 - Math.pow(1 - CURSOR_DAMPING / 100, dt * 60)
        p.x += (p.hx - p.x) * k
        p.y += (p.hy - p.y) * k
        clampParticle(p)
    }

    function updateFall(p: Particle, dt: number) {
        // Gravity in canvas heights per second squared, so a short box and a
        // tall box fall at the same visual rate. 50 == the shipped rate.
        const accel = (params.gravity / 100) * 24 * canvas.height
        p.vy += accel * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y >= floorY) {
            p.y = floorY
            p.vy *= -0.25
            p.vx *= 0.8
        }
        clampParticle(p)
    }

    function startSpread(now: number) {
        phase = "spread"
        spreadStart = now
        particles.forEach((p) => {
            p.fx = p.x
            p.fy = p.y
            const pos = computeNearPosition(p)
            p.sx = pos.x
            p.sy = pos.y
            p.hx = p.sx
            p.hy = p.sy
            p.done = false
        })
    }

    function tween(p: Particle, start: number, now: number) {
        const dur = phaseMs()
        const delay = p.delay * dur * 0.5
        return Math.max(0, Math.min(1, (now - start - delay) / dur))
    }

    function updateSpread(p: Particle, now: number, dt: number) {
        const t = tween(p, spreadStart, now)
        const ease = 1 - Math.pow(1 - t, 3)
        p.x = p.fx + (p.sx - p.fx) * ease
        p.y = p.fy + (p.sy - p.fy) * ease
        clampParticle(p)
        if (t >= 1) p.done = true
        maybeScramble(p, 0.72, dt)
    }

    function startForm(now: number) {
        phase = "form"
        formStart = now
        particles.forEach((p) => {
            p.fx = p.x
            p.fy = p.y
            p.done = false
        })
    }

    function updateForm(p: Particle, now: number, dt: number) {
        const t = tween(p, formStart, now)
        const ease = 1 - Math.pow(1 - t, 3)
        p.x = p.fx + (p.tx - p.fx) * ease
        p.y = p.fy + (p.ty - p.fy) * ease
        if (t >= 0.98) {
            p.x = p.tx
            p.y = p.ty
        }
        clampParticle(p)
        if (t >= 1) p.done = true
        maybeScramble(p, 0.72, dt)
    }

    function draw(now: number) {
        rafId = 0
        if (!visible) return

        const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60
        lastTime = now

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = params.color
        ctx.font = `${cellDevice}px ${params.glyphFamily}`
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        for (const p of particles) {
            if (phase === "idle") {
                updateIdle(p, dt)
                applyMagnetic(p, dt)
            } else if (phase === "fall") updateFall(p, dt)
            else if (phase === "form") updateForm(p, now, dt)
            else if (phase === "spread") updateSpread(p, now, dt)
            else if (phase === "done") {
                applyMagnetic(p, dt)
                maybeScramble(p, 0.9, dt)
            }
            ctx.fillText(p.char, p.x, p.y)
        }

        if (phase === "form" && particles.every((p) => p.done)) {
            phase = "done"
            particles.forEach((p) => {
                p.x = p.tx
                p.y = p.ty
                p.hx = p.tx
                p.hy = p.ty
            })
        }
        if (phase === "spread" && particles.every((p) => p.done)) phase = "idle"
        if (phase === "fall" && now - fallStart >= phaseMs()) startForm(now)

        rafId = requestAnimationFrame(draw)
    }

    function ensureLoop() {
        if (!rafId && visible) rafId = requestAnimationFrame(draw)
    }

    function stopLoop() {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = 0
        lastTime = 0
    }

    function triggerFall() {
        if (phase !== "idle") return false
        phase = "fall"
        fallStart = performance.now()
        const H = canvas.height
        particles.forEach((p) => {
            p.vy += (0.05 + Math.random() * 0.2) * H
            p.vx += (Math.random() - 0.5) * 0.5 * H
        })
        ensureLoop()
        return true
    }

    function onClick() {
        if (phase !== "idle" && phase !== "done") return
        if (phase === "done") {
            startSpread(performance.now())
            ensureLoop()
            return
        }
        triggerFall()
    }

    function onPointerMove(e: PointerEvent) {
        const rect = canvas.getBoundingClientRect()
        // Ratio, not dpr: the rect carries the canvas zoom, and dividing it out
        // this way keeps the pointer under the cursor on a zoomed Framer canvas.
        const sx = canvas.width / (rect.width || 1)
        const sy = canvas.height / (rect.height || 1)
        mouse.x = (e.clientX - rect.left) * sx
        mouse.y = (e.clientY - rect.top) * sy
        mouse.active = true
    }

    function onPointerOut() {
        mouse.active = false
    }

    async function reset() {
        const prevMode = logoMode
        // A resize must not re-scatter text the viewer has already assembled,
        // so a settled field comes back settled at the new size.
        const wasSettled = phase === "done"
        resizeCanvas()
        const targets = await sampleTargets()
        if (destroyed) return
        particles = spawnParticles(targets)
        if (wasSettled) {
            phase = "done"
            particles.forEach((p) => {
                p.x = p.tx
                p.y = p.ty
                p.hx = p.tx
                p.hy = p.ty
                p.done = true
            })
        } else {
            phase = "idle"
        }
        lastTime = 0
        if (logoMode !== prevMode) scrollRevealDone = false
        ensureLoop()
    }

    function scheduleResize() {
        // ResizeObserver fires once on observe(), and a resize restarts the
        // animation — without this guard that first no-op callback lands ~120ms
        // after mount and cancels a fall the viewer has already triggered.
        if (root.offsetWidth === lastCssW && root.offsetHeight === lastCssH) return
        clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(() => {
            void reset()
        }, 120)
    }

    root.addEventListener("click", onClick)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerleave", onPointerOut)
    canvas.addEventListener("pointercancel", onPointerOut)

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(scheduleResize)
        ro.observe(root)
    } else {
        window.addEventListener("resize", scheduleResize)
    }

    const io =
        typeof IntersectionObserver !== "undefined"
            ? new IntersectionObserver(
                  (entries) => {
                      entries.forEach((entry) => {
                          visible = entry.isIntersecting
                          if (visible) {
                              ensureLoop()
                              if (
                                  params.autoFall &&
                                  !scrollRevealDone &&
                                  phase === "idle" &&
                                  entry.intersectionRatio >= 0.8
                              ) {
                                  scrollRevealDone = true
                                  triggerFall()
                              }
                          } else {
                              stopLoop()
                          }
                      })
                  },
                  { threshold: [0, 0.25, 0.5, 0.75, 0.8] }
              )
            : null
    if (io) io.observe(root)

    const onMobileChange = () => scheduleResize()
    if (typeof mobileMq.addEventListener === "function") {
        mobileMq.addEventListener("change", onMobileChange)
    } else if (typeof (mobileMq as any).addListener === "function") {
        ;(mobileMq as any).addListener(onMobileChange)
    }

    const ready = reset()

    return {
        ready,
        triggerFall,
        stats(): Stats {
            return {
                bufferW: canvas.width,
                bufferH: canvas.height,
                dpr,
                maskW,
                maskH,
                lines: maskLines,
                dispScale,
                stepMask,
                cellDevice,
                cellCss: cellDevice / dpr,
                particles: particles.length,
                drawnCssW: (maskW * dispScale) / dpr,
                drawnCssH: (maskH * dispScale) / dpr,
                latticeErrX: latticeError(
                    particles.map((p) => p.tx),
                    stepMask * dispScale
                ),
                latticeErrY: latticeError(
                    particles.map((p) => p.ty),
                    stepMask * dispScale
                ),
                phase,
            }
        },
        destroy() {
            destroyed = true
            stopLoop()
            clearTimeout(resizeTimer)
            root.removeEventListener("click", onClick)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerleave", onPointerOut)
            canvas.removeEventListener("pointercancel", onPointerOut)
            if (ro) ro.disconnect()
            else window.removeEventListener("resize", scheduleResize)
            if (io) io.disconnect()
            if (typeof mobileMq.removeEventListener === "function") {
                mobileMq.removeEventListener("change", onMobileChange)
            } else if (typeof (mobileMq as any).removeListener === "function") {
                ;(mobileMq as any).removeListener(onMobileChange)
            }
        },
    }
}

// #endregion engine

type FontValue = {
    fontFamily?: string
    fontWeight?: number | string
}

type CursorGroup = {
    strength?: number
    reach?: number
}

interface TextFallProps {
    text?: string
    color?: string
    glyphFont?: FontValue
    align?: Align
    size?: number
    glyphSize?: number
    speed?: number
    autoFall?: boolean
    gravity?: number
    scatter?: number
    cursor?: CursorGroup
    style?: React.CSSProperties
}

const CURSOR_DEFAULTS: Required<CursorGroup> = {
    strength: 150,
    reach: 30,
}

export default function TextFall(props: TextFallProps) {
    const {
        text = "TEXT FALL",
        color = "#00FFC1",
        glyphFont = {
            variant: "Regular",
            fontSize: "16px",
            textAlign: "left",
            fontFamily: "Menlo",
            fontWeight: 400,
            lineHeight: "1.5em",
            letterSpacing: "0em",
        } as FontValue,
        align = "center",
        size = 90,
        glyphSize = 10,
        speed = 50,
        autoFall = true,
        gravity = 50,
        scatter = 100,
        cursor = { reach: 30, strength: 150 },
        style,
    } = props

    // Spread-merge over a typed literal rather than a ?? chain: one missed key
    // in a chain silently pins a control forever (rule 11).
    const cur = { ...CURSOR_DEFAULTS, ...(cursor || {}) }

    // Primitives only in the dep list — a fresh font object every render
    // would otherwise rebuild the engine each time.
    const glyphFamily =
        (glyphFont && glyphFont.fontFamily) ||
        "ui-monospace, SFMono-Regular, Menlo, monospace"

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useLayoutEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const engine = createTextFall(root, canvas, {
            text,
            glyphFamily,
            color,
            align,
            autoFall,
            glyphSize,
            textSize: size,
            speed,
            gravity,
            scatter,
            strength: cur.strength,
            reach: cur.reach,
        })
        return () => engine.destroy()
    }, [
        text,
        glyphFamily,
        color,
        align,
        autoFall,
        size,
        glyphSize,
        speed,
        gravity,
        scatter,
        cur.strength,
        cur.reach,
    ])

    return (
        <div
            ref={rootRef}
            style={{
                position: "relative",
                // Deliberate deviation from the repo-wide 1200x800 floor: this
                // component is meant to be placed at phone widths, and a 1200
                // minWidth would force horizontal overflow on every mobile
                // breakpoint. The floor here only has to stop the 0x0 collapse
                // Framer's Fit Content sizing causes; the drop-in size comes
                // from the @framerIntrinsic annotations instead.
                minWidth: 200,
                minHeight: 120,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                cursor: "pointer",
                background: "transparent",
                touchAction: "manipulation",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}

TextFall.displayName = "Text Fall"
