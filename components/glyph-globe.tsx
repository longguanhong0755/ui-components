"use client"

import { useEffect, useRef } from "react"
import { animate } from "motion/react"
import type { Transition } from "motion/react"

/**
 * "AsciiGlobe" — a world globe drawn as rows of dots, with the land typed out
 * in ASCII. The pointer pushes the dotted lines aside.
 *
 * Reference read (a close-up frame of the effect):
 *   - The globe is only its LATITUDE rows: evenly spaced dotted lines that bow
 *     with the sphere. No meridians, no outline.
 *   - Each row is a string of cells. An ocean cell is a small dim dot, a land
 *     cell is a glyph. The glyph is picked by how far the cell sits INSIDE the
 *     land: coasts are light (`- = + *`), interiors heavy (`o 8 $`). That is
 *     the whole "shading" — a ramp over distance-from-coast, not a light.
 *   - Glyphs stay upright on screen and shrink with depth; along a row they sit
 *     one advance apart, so a run of land reads as a word (`$$$$$$`). Rows sit
 *     two advances apart.
 *   - A few interior cells flip to an orange `@` — the only second colour.
 *
 * Architecture (rule 8): WebGL2, one instanced draw of camera-facing quads. Globe
 * rotation, projection, back-face cull, limb fade, the pointer push, the glyph
 * pick and the accent twinkle all run in the vertex shader. The context is
 * built once; every live input is read from a ref. Glyphs come from a 4x4
 * canvas atlas redrawn only when the font or the ramp string changes.
 *
 * Quads, not gl.POINTS: some GPUs snap point sprites to whole pixels (and cap
 * their size), so a glyph drifting under a pixel per frame moved in visible
 * steps. A quad's corners are rasterized at their exact sub-pixel position on
 * every GPU.
 *
 * Land: the land-110m raster from RouteGlobe (0.25°, RLE). A chamfer distance
 * transform over it gives every land cell its distance to the nearest water in
 * degrees; the ramp spans RAMP_DEG of it.
 *
 * Repel: in SCREEN space, after projection, so the rows bend around the
 * pointer the way lines on paper would. A point at distance d < R from the
 * pointer moves out to d + h·(1 − d/R)². That map is monotonic in d as long as
 * h ≤ R/2, so rows part and bunch up at the rim but never fold through each
 * other — Lift is a percent of that limit.
 *
 * Spin is a TICK, not a drift — a quartz movement run fast. Every 1/rate seconds
 * the target angle advances by Step and the globe moves there on the
 * designer's Transition (default: a stiff under-damped spring, so it lands
 * with the small overshoot a quartz hand has), then holds still until the
 * next tick. The rAF loop owns the tick clock; framer-motion's animate() only
 * tweens the angle between two ticks, and the loop reads the tweened value.
 *
 * Framing: the defaults show the whole globe. The reference's close-up (camera
 * skimming the surface, horizon near the top) is Distance 170, Density 110,
 * Tilt 40, Offset Y 60.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

// ---------------------------------------------------------------------------
// Land mask — land-110m rasterized at 0.25°, RLE of alternating water/land runs
// as base64 varints (5 payload bits per char, bit 32 = continue). Starts on a
// water run. Row 0 is 90°N, column 0 is 180°W. Same data as RouteGlobe.
// ---------------------------------------------------------------------------

const MASK_DEG = 0.25
const MASK_W = 1440
const MASK_H = 720
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const LAND_MASK = "h3jBIqsB1BqmBOFWlDwC3lBrCoC+CilBDI0C8BmD7kBMC0CtBDNhD3kBmDTTHOI7BPBhlBqDN/BCwCFHZEvjBhDThFMaojBjDP+EEmB3iBKI8CLsGwNHgVQI2CLrGhICsFR6UXIrCMqG7EC4CNBKkFY2UgBYxBKrGrEPBP0CKoFeyUlBDNBzBKpGuElBwCGwFbyUkBD+BTgG6DFHJEiBnIdxUjBEzBf8F0DgBGZrIdzUCFdDnBnB7F3DkBnJaqTJlBdGmBgBiG5DnBoJVEK9SQdaFpBZpG7DnBuJNEQ8RKVQIJLVDwBPwG+DfkKT3STHMKRDxBK2GgEbME0JV8RDlBIGKmBmBO2GjEXJJyJLhSNyBBkBFFfXyGnESLNsbBNJ6BKXKBcesGpEMOKiKD/QNxDkBxB+FkEP0KO3QQuCFdiBlBvGmEKyKM5QTtCMSuBcqGwEHoGEjEYtQTcGiBCEBGWHsBhBiG8KOhEZCP5PPLFQJcNNQPJJLoBkGwKV4D4BzPNMQKHXTRK5CJSoFiKcwDCGgClDD/MUIQNTTM3DiF8JZuD0C+CWvMZHONFCMLBIOQR4C9E3JYpD/C9CenMvBULHIGyB3C7EzJVsDjD8CgBFG9LPFXVMGLFyB2C4ExJWpDnDhDcHQiMQzBLFyB5C2EwJSqDlDpDYNKhMLhCDNoB+C2EvJOrDiD4PJgI2ErJOuD/C1Pe7CC1EuEvJPxD+C3Pf0CTqEvEpJQwDnDECsPgBpBCRPGTOGMEFL4CuEsJM8CjEEPVFgCKzLhBlBJMRFTKKGMEO2CpEtJN+C6ERRyBOvLfEHYGCFPOHRJMGPDQ0ChEyJO/C6ERUrNcEKGDJBGJBCSMHOLODTDGBI0CiEuJO0BJkBhGoNaDaDHELLXEJPPBVKD6CiErJN1BPIDUiGrBPsLYEnBDLNWDIPlBIK1C5DGErJM1BQIDVhGpBf9KXFpBDLPSFGPmBCUwC+DvJO1BQJCGND/FqBpByKXFqBCMSPGCT+BsCiEqJQ0BQHFCUB+FrBqB1KRF6BUMEJO/BqClEoJQyBQGIC0GMEJCQqB3DI5GNJuHV+DpJPuBSFIE1GJWB3BzDJyCJ/DFTzBgBPQlCqCuDCMgGnQhDEwCBDNDCsE6BeRMpCrCsDEK4FVgDPmBXGkHB2CEkD0CgBpE7BbSLvC8BLBoDHH3FbxEYH0K8EzByCD8BpBXTOvC3BzDlGfwEXG2K4EiCIB1BCGFrB8BTTXcBrB1BiEsFlB1EWF3K1EzCqBKCJGCdhCJGGPiBQFqB0B+DrFsBGBsEWE4KqBLgD7CfaCFFJQ/BHLFOZMWmBzBMDsDrFxBBHtDKRXD7KIJWduCiDN+BO4BLPFRUPVlB2BDIpDsF9BrDQPSFvKrBIoDnDInCPeGOMNGPECORUkBhCzIoCkDSMRF8LImBzYxC/CULQI6LErBuY2C7BGPFFZKQGtNoY7CUGaIGSBeFUDxNjYhDRKRPBrCFyN/XmDPKM+CH0N6XpDNJJiDH4N2XrDLHKjDG7N0XsDMGKiDG8NCLlXuDNGIhDI8NCNiXwCGYPtDGhOBO/WzCKQGGEsDG0O8W2COGIKBgRFiB6WrBFqBYuREgB7WoBMnBVyRNPhXoBOmBVxRPO/WoBRmBUhSNY9JEMUvB5BvBiCoBkDpBOpBHGIuRWJaPFmJFQPzB2BuBoChBlDqBMrBHKDsRcFnBBFmJHSPMEjB0BuBsCblDsBJuBIzR1CiJJThBgB1BtBpCanDsBJ1BD1R0C6IONDJgBe1BrBsCUpDsBJwTnBCBDlB5IPEBHGIiBd0BrB1CHsDrBKyTmBKb/IUEyBQDL2BnBnGsBK0TtBESFBhJVB3BPEI3BkBmGtBL3TgClJhBFsBPFE6BgBlGuBM5T+BjJiBHwBMjCejGvBN6T9BiJjBGKBHHJBTKiCdhGxBO4REyBHD8BjJzBEFUWFiCd/FxBP3RFvBpCiJ0BDGW8Cc+FyBQ1RFsBsCiJ+BY6Cc+FxBRjRFMGmByChJ/Ba5Ca/FxBR9QLKHlB2C6BCiHhCb5CY/FxBR7QOHJjB5C3BCPBzGiChB1CVhGxBP7QQEIkB7C1BCNHxGiChB/CLhGyBP4QSBJkB+CzBDNLsGkCgBgDJiG0BQPJ8PbZEG4CGFwBDPOoGkCgBSCuCHiG2BPJR3PbRBGJD8CDHDElBFMd7FmCfRE2I1BRBX3PaREB+DiBHHnB2FlCgBQG1I1BnBmPBSZLqEgBJFsBzFjCiBPI1ITBfYzPJOWMrEhB7BxFiCkBNK0IREdVgPgBOVMsEFCMBP7ByF+BnBLLzIPHaY6OlBGbN4ECGP+BzF8BoBHOvHBjBNJWb4OnCNgFOjCxF9BoBCSmHImBJLWc1OnCOhFNxCkF+B8BkHIqBBRVfxOnCOhFLGEqClF+B8BiHI9BVewOjCUhFIGIqCkF/B8BhHHCGxBBFTXCGuOkCa6EIGJrClF/B8B/GQvBDFTUGFtOlCa5EIIGuClFBH3B8B+GPsBHGSTIErOmCb3EILCzCvFzB8B+GPqBIIQU1OmCc2EHkDxFwB8B+GOrBIJPT1OmCd0EHoDxFtB8BgHMrBLHOUzOoCdyEJoDzFrB+B+GLsBJBBIHECUyOpCawEMrD1FnBhC9GOoBIFFBHawOqCavEIBCuD5FhBlC7GBCMnBHFNctOsCZuEG2D6FeoC8GMoBGFGCBgBsOtCZrEG8DjGQtCuGDHOoBFHDjBrOvCZoEH/DiGN1CnGHFPnBGIBftOxCalEFkEhGK6CjGLILmBGbIEzOsCXxIgGM5CiGMKLkBKFCNkPrCTpIBL/FO4C/FNMLkBJCIGoPHFJC0BSqIGI+FN4C9FONMiBWCtPCIJB0BSqIFK9FN7C7FNNMcEByQGDzBSrIEL8FO8C5FOGTW9QDF0BQuICL9FN8C6FNFUSiRCF0BOxIBL+FM8C6FMGWPjRCGzBK1ICM8FN7C6FLIZLjRCG0BJ3IBO6FL8C5FLKXLkRBH0BInJ7FK8C4FKKZLkRBH0BInJ8FI7C5FILaLkRDG0BHoJ+FG5CDBrGZKlRDG1BFqJ+FD5CDEvGVHmRFG0BDtJ0IGFtGXFoRGG1BBuJyIHFtGWDsRHFgLDFsIIFsGJBENsRHGgLHEnIJFrGIUsRHGgLLBrHREOFBBpGDZtRHHjLICoHJDXKgHwRHIjLIDlHMFTJ3GCFzRHIlLHEgHRGPMCDxG4RHKmLID8GHHJDNUvG4RHEECnLIE4GGLXUpGCF4RHEwLGD3GFOVVCBiGiSIE6L1GDPXYiGiSIDyLFE0GDPYYiGhSJDzLGCzGCRWbiG/RKC1LFCyGCSXLBHCFmG6RLD0LGCvGDTnBCDFoG3RMEzL2GDVkBDEFqGiFEuMNFzL0GBYCBNBZFsG8EGxBE7KOGyLtHCCMBrHjEDQIxBM1KPDBCyLuHCIECsHgEFOLsBR0KPCDByLvHEDFEsH/DKIMsBRzKQB3LyHIGrH+DNGLsBSyKpM/HsH5BDhCMIKpBVyKqM9HuH2BGgCLQDpBSBDxKTB3LjHKNxH2BGCC7BPMCqBQ2KUD2LkHHL1H3BK3BBBRGJnBR1KVE1LjHGK4H2BL3BSFNkBS0KWF0LgHHJ7H3BL2BUBSiBN3KWIyL9GKH9HmBFML2BpBhBO0KXKEBrL6GNG9HmBJLK0BrBhBOyKYQpL4GRDkHEWkBMNKyBtBfOwKaQpL3G3H1BBJNOLvBvBePuKZSoL4G1HyBdNNsBxBdPjKCHYSrL3G2HxBZBEOOpB1BaT9JFEZQuL3G3HwBXDFOPnB3BZT6JjBHBIwL2G3HwBWEHNRkB3BaT4JkBHDFxL2G3HwBWEIOQkB3BaR3JnBFHByL3G2HwBXDJROiBUKZbQCDxJoBF6L5G0HvBYCMPOiBRQVdPCEvJpBE7LyG7HtBqBONlBMUSfVuJoNsGiIpBeBSNJmBCFDaMiBVtJqBF5LwG+HmBeFSOHVDJGyCUsIBgBpBG5LpGlImBeGUNFSJEIyCNwIFdrBH3LqGkImBgBFUICEFNBEJCC8CKvIGbtBH4LpGkIkBiBFWGFCENCFK6CNtIHavBH5LnGlIkBiBFXEOLQ7CPpIIKBOxBI5LmGkIkBjBFYEOLN9CPpIIFJKyBI5LhGBDkIlBjBFYGMMM9CPoIJEMIyBI5LhGCBlIlBjBCcEOLN7CRiINDNJyBH6L9FBEnImBgCDQJP5CTgIeLvBH8L8FBFmImB/BDRLM5CU/HfMuBG+L7FBFnIkBgCCTLL6CTgIdOsBH/L5FBBBDqIhB8BEBCULK6CThIbQqBHhM6FCBrIhB0BLYLL5CTlIZPoBIiM5FuIgB1BLYIP5CSlIGETLmBKiM5FBBsId6BJZHQ8CPkIEKQLkBLjM4FuIcrBFOGZFS9COyIRKdCDNjM5FsIBDBFSfSBCODaFS9CK0ISLcDBNlM4F3IHZkBtBEXHFLDDBzKVNbSmM4F2IFXnBrCFGJHzKWNbRnM4F3IDWpB4CBNzKWNaTnM3FuJsBlDxKZMaToM2F3IEPxBkDvKbMSFCTqM0F3IGDCHzByBIeCBBIuKcLNgBrMzF3IkC3BHZGItKdKNgBsMyF3IlC3CFJtKdHPewMuF6IkC5CBMvKbFQY6MpF7IkCmDyKsBIHI/MmF7IlCmDyKqBIEEBGkNgF9ImClD0KoBCHIBFnN8E9IrChD1KnBEFIECpN7E7ItChD1KlBICFCBxN5E6IxC/C2KjBKBE2N2E7I2C6C4KjBJCC3N1E7I+CaJwB4KjBI9NyE9IhDVLvB6KkBG9NxE9IjDTPsB7KkBE/NvE+IkDSUnB8KiBF/NIBlE/IkDRVmB+KhBFgOGGhE+ImDRdLHL+KhBEhOHG/D/IqDNgBGJBDFgLiBBkOGG/D/IuDJ3MoPGH+D/IwDG2MrPFHiDBGCT/IyDC5MrPEI9CPS/IpHCDB9IrPFH9CQEDK/ImHJ/IqPFHpCGDCIYJ+IoFB/BJ+IrPFHmCOIYJ8IqFBIB0BK+ItPEGkCxBI7IrFBIB1BK9IuPEFjCzBI4IuFBGB2BK9IvPEFhC0BI2IwFBGB3BK7IwPFF9B3BJ0IyFBFB3BL6IwPGF7B4BJyI0FCDC3BL3IyPHI3B5BJvI4FCCE2BL2IwPKI1B6BKsI7FI2BNyIyPKH1B6BKsI7FJ2BOvI0PJI0B7BJrI9FI3BOuI3PHIyB9BJJBgI9FJ3BPIG9H6PHHyB8BJEFBC9H+FK4BQDI9H8PFJwB9BILB7HhGJ4BYBD7H+PEJwB+BHLB6HiGK3BYBD6HgQEHxB+BHlIkGJ3BDCSCD6HgQEIwBgCEmIlGK1BCDRCJ0HhQFJuBgCEmIlGK2BBDPEOZCzGiQFLrBjCBJC8HmGK1BBDOFUDTxGJC4PGKrBtCC7HoGJ5BNHqBwGIE4PFLqBsCD7HpGI5BMIrBuGIE7PDMoBuCD4HrGJ4BLKqBtGIF8PFLmBvCC3HtGK3BCTpBrGKF+PELlBwCB3HuGKtCpBoGKFgQELkBnKuGMwCnBkGMFhQDMjBmKvGNxCmBhGOFhQDNiB9BElIvGNxCoB+FPEjQBPhB5BO/HwGNxCoB7FREzQhB3BFEJ9HyGLyCoB0CE9CWD1QgB2BEEQ3H0GKzCnB0CF3CCBZC9JC2GgB1BCLO0H2GJzCmB1CF2C1RfzBDQLyH4GIyCoBuCMzCkLByGgBoCKwH4GIyCpBoCRhCDMnLCyGfiBJgBIvH4GIxCrBkCU/BIEwLCuGgBdNhBKsH5GIvCtBHD5BU+BJEyLCrGhBcOiBKrH4GKtCvBEF5BV7BLD0LBrGhBbOmBLpH2GKsC5B5BW5BMD/RjBaNoBMnH2GLpC7B4BX4BND2LCoGjBZMoBNoH1GNmC8B3BZ2BnMEmGkBYMnBBRCFD6G1GOlC8B1Bc0BNH0LEnGjBXN5BN3G2GOkC8ByBiBwBNI0LEoGjBWN7BM2G2GPjC8BxBiBxBMI1LCrGiBVO7BO0G2GPjC8BwBkBwBMHlShBSP9BPyG3GP/BgCuBmBvBMHnSjBLS1BCGRwG3GP+BhCtBnBwBLGpSjBEWBBmBGJSECFGmG4GP8BiCsBpBwBLDsBDCB7Q8BnBIJBHEPGmG6GN8BiCrBqBwB5BH/Q3BqBEUC8G7GN4BmCpBsBwB4BHhR1BgJ7GO1BoCnBuBxB3BHiR0BgJ8GO0BoCmBvByB2BIjRyBgJ8GOzBpCkBxByB1BJmRvB/I+GOuBtCkBxBKBoB0BJpRsB/I+GPpByCjBwBKCpBzBItRoBgJ/GOnB0ChByBJEpByBIvRLDXhJ/GOmB1Cf0BHGrBvBIzRGITFBFHwI/GOmB1Cb5BFIrBuBHkSlBtIhHNmB2CamCrBuBGmSlBsIjHLkB5CYnCsBtBGnSmBpIlHKhB8CYnCtBsBGoSlBoInHJegDXnCtBtBFpSkBnIqHIakDWnCtBtBGpSjBoIqHHZlDXnCsBvBEqSiBpIqHGXnDXnCtBuBKpScrIqHGSsDWnCtBuBMpSarIrHFRtDWnCtB0BHsSWrIsHEMyDWoCHEhBtBDFBBEySQrItHDJ1DWpCGEhBtBEHDxSRrIuHDG3DWpCGEhBuBDIDySPrIwHCC7DUqCGHevBC+SOvBB7GwH/DUqCGJcvBBNDwSMvBD7GvHgETqCGKb9BEwSLtBFEC2GtHeChDSrCFMa+BDxSKsBGEC2GtHcEiDRsCEMazBCKDxSJqBFHG1GrHVKjDQsCENX1BEFGySImBKDK1GrHQOjDQsCDOW2BEGCCBxSJiBccB5FqHMRkDPrCEPUsBBKDBCBBCC1SJgBPBNHBIICD5FrHFXkDPrCEQRtBDJCCEDC0SJgBPCVHGED6FmIkDPrCDVLvBCNCBCDC0SKfODYCJCE6FlImDMtCDWJvBCOE7SCBHdPEmB+FjImDLuCDXHvBCOE9SBBJbPEnB+FiImDLECoCDXGvBCPEIB5SHKFKRCqB9FgIoDKEDnCDWGvBCRCJC5SGHKHSCqB9FgIoDKEElCHTEwBCdD5SICGCFF/B+F/HoDHHElCHUCwBCbG4SQFnC+F+HqDGGGkCIkCBdG6SNGrC6F+HrDEHHjCI7CDCJ6SBEFJsC5F8HuDBIHjCBBG5CQgTFItC4F8H3DHmCF4CRiTEHuC4F6H4DImCF2CGCKiTDJuC4F5H4DInCE2CDGJvTtC5F3H5DInCF1CCGHBCwTsC7F1H5DIoCF/BCbGCCwTvC6FyH7DHpCH7BEaGCBxTwC6FxH7DGrCH5BGaF1TwC6FyBLyF9DDtCJ3BGaG0TzCCGxFtBPxFtGJ2BIbD0TgDuFpBTvFuGK0BLbB0TjDsFlBXtF7FFPLxBQtUkDtFRFMYtF7FJLMvBRuUkDtFMOEbsF9FJLLtBQxUlDuFHxBKC+E/FJKMrBRwUnDvFC1BFH8EhGJJMqBSwUpDwH8EiGJJLqBP0UoDxH6EkGJIKqBQ0UpDyH3EmGJIJpBQ0UqDyH2EoGKHJnBRzUrDzH0EqGKGJmBSzUsDyHzEsGKFJhBXwUvDyHyEtGLFJeavUvDyHxEvGLGIdbtUxDwHxEyGJHHdbtUxDwHvE1GODGVCFbnBBkT0DuHuE3GODFUjBmBClTzDtHtE5GPDETmBZCJFgT1DtHsE7GPZnBIDLDKF+S3DuHpE9GPZnBHRLF9S3DvHoE+GQYjBJSMF9S2DvHoEgHRWiBKEIFNF8S3DvHnEhHSViBJCdC/S6DsHmEjHRViBJBfB+SgEmHmElHPWiBJBfBRBsSgEmHlEnHOXhBIDfBPGoSgEBG+GlEpHOWhBIEGFTBKNkSsE7GlEqHQUeKFCGgBOkStE6GjErHQVcKNiBNkSwE3GjEsHPWaLMmBKkSwE4GgEuHPWaLJqBJLHxRyE4G9DxHPWZLKqBIKKwRxE4G9DxHRUZKLwBCIOvRBCtEBHxG6D0HSSZKMqBIGUnBCjQ6EuG5D1HSRZJHCFXHJKFYlBDhQiFnG4D2HRXSLFDGWKIKDalBC/PlFmG2D4HQYCFKLFDFPFDEBFJpBjBC9PnFmG0D6HPiBHNDDFQDNCIDBoBiBB6PrFlGzD6HPjBDCBNDEFpBDDpBgBC3PtFlGyD7HO2BEEFvBqBeC3PuFlGwD9HM4BDEGwBpBZDCB3PvFkGvDgIK3BEEDCB1BlBYDCB3PxFjGuDhIJ3BEID2BkBXD6P1FgGsDkIH3BEHE4BjBQBDFJBxP3F9FsDlIG2BFHD8BgBQBCFKBxP3F9FrDnIF4BBKBvBBNiBHNNBwP3F+FqD+LCOjBGLOCuP5F9FqDtIGqDDOmBGGRCvP3F9FqDsIKoDBQlBdDvP2F+FqDqIMJD7CBQlBeDvP2F+FrDpIapDiBiBBDCtP0F+FrDrIanDiBnBCsP0F+FqDtIZnDjBoBBDBoPzF/FpDyIWjDmBsBCmPzF/FpD6IU9CYGJsBDlPxFgGpD9ITeB7BFBRKJsBClPwFhGoDpJJIFFDFCQCqBFFMMItBCCCgPwFhGoDsJDIIELKH2BLNIxBBhPvFgGqD1JGJEOG5BLMIxBCgPuFhGqD0KF+BHPKvBBhPsFiGrDgKBQF3CJqBCEBgPsFiGrD9JFOF5CKoBEDBgPqFkGqD/JFLF7CJqBCkPpFlGrDgKDLE+CKuQnFnGrD2NErBBhPlFpGsD2NBtBDgPjFrGrD3MCuRjFrGrD3MCvRhFsGrDuLEkBDvRgFtGrDwLDjBDwR/EtGrDwLFhBEvR+EtGsDwLKCFUGvR9EtGsDiBCmKYTGwR7EtGtDhBEjKZUGwR6EtGuDhBEiKaUHwR3EuGvDhBFhKZUIxR2EtGwDgBGhKXWIxR1EuGwDgBGgKYWIwR2EuGwDeIzJCKZWIxR1EtGxDeJwJFIZXJwR1EtGyDcKuJJGZXJCCtR0EtGyDcKsJMFYYOtRzEsGzDaMrJQCYZO2CB2OyEsGyDaOpJsBYO2CC3OwEsGyDZPoJuBWP2CC4OvErGyDZNBCnJxBUP2CC6OtErGyDWQqJzBSQrErI9ErErGxDUTqJ1BPR3CByBusBmNngBzNmErGtDVWkJCC8BJTkECzNjEsGrDXVkJDC+BHU6RhEsGpDYWjJkCGVhEB4NhEsGmDbWjJnCCW+DF4NgEsGlDcWjJgD8DG6N9DtGkDdWjJ/C9DF9N7DuGiDeVjJgD/R6DwGgDgBUiJiD+R6DxG9CiBTiJjD+R6DyG7CjBTiJlD8R6DyG6ClBShJoD6R6DyG5CmBRhJrD4R5D0G3CnBR+IvD3R4D1G3CmBS5I2D+BC1P4D2G2CmBR3I6D+BD0P2D3G2ClBS1I8D+BEzP1D4G3CkBSvIjE+BEyP1D5G2CkBRvIlE+BExP1D6G2ChBTtInE/BFvP0D7G2CgBUsIpEgCEtP1D8G1CgBToIBBsEhCEsP0D+G1CfToIBBsEjCDrPyDgH1CfTnIyEuRyDhH0CfSoI0EsRxDiH0CgBRoI0EsRqDpH0CgBRoI0EsRmDtH0CgBRoI1EqRmDuH0ChBPpI1EqRjDxH0ChBPoI4EoRgD0H0ChBPoI5EnR+C2HzCiBOpI6EmR9C3HxCkBOpI7ElR7C6HtCoBMrI7EjR8C6HrCrBJtI8EiR7C7HpCwBEwI8EhR6C8HoClK8EhR5C+HmCkKBC7EhR5C+HnCjKCB8EgR5C+HoCjK+EgR4C/HnCjK/EgR5C/HmCkK+EgR5C/HmClK8EgR6C/HlCmK9E/Q6CgIkCmK9E/Q6ChIjCnK9E9Q6CjIiCnK9E9Q6CkIhCoK8E8Q7CkIgCqK7E8Q5CnI+BrK7E8Q4CpI8BsK7E8Q3CqI6BvK5E9Q3CrI5BvK5E9Q2CsI4BwK5E9Q1CuI2BxK5E9Q1CuI2BxK4E+Q0CwI0BzK3E9Q0CyIyB0K3E9Q0CyIxB2K2E+QxC1IvB3K2E+QwC3ItB5K3BI2C+QvC4IsB6KzBOzC/QuC5IrB7KwBWuC/QtC6IqB8KoBgBrCgRsC6IqB9KmBkBoChRsC6IoB/KjBmBoChRsC8ImBgLiBpBMB4BiRrC9IjBjLhBrBKC3BjRqC+IgBjLkBsBIE2BjRpC/IRBCDECBlLYCJuBGE2BjR2BBT/IP0LT+BEF3BjR2BCRiJJ6LQ/BEF2BjR4BGKnJD/LLjCCGCBzB3CCqO6BKCsVIsCCCyB4CDoO8BqYCExB5CEmO9BuYxB7CElO9BuYwB9CEjO+ByYsB9CEjO+BzYrB+CDiOhCyYpBhDChOhCyYpBhDDBB+NhCyYpBiDCBC8NhC0YoBiDF7NhC1YoBjDF6NhC2YmBkDGHBxNgC4YfqDIDEwN/B7YOCKtDPwN9BiZIDJuDOxN6BoZDHGuDPyNsBCE7ZCwDOzNsBxdQzNsBwdN2NtBydL1NuB0dJ1NuB1dH2NuB2dG2NuBrdBJG3NkBBI9ZEHDgDDIF3NkBEChaGBH/CFBCDG3NkBnaO/CJDD5NkBoaN+CK/NkBpaM9CL/NCBiBDBkaM8CL/NDDlBjaL9CKgODDkBlaK8CKhODDhBoaK7CKiOCDhBqaHBB5CLoOgBsaF7CLpOfwaB6COoOfpdNqOgBmdOnOEBgBldOoOkBldOpOkBjdQpOfndQqOendRpOeodQqOdodRpOepdOqOfudHrOhBwdCxOfhsBhB+rBkB7rBlB6rBlB7rBlB6rBkB8rBiB+rBhBgRD8agBhRH4agBhRH4afiRG5afhsBcksBbmsBZosBYosBYnsBZjBDCE7qBagBM6qBaeFBH8qBaeDDChrBVtsBQDDssBMCHpsBCCJDIpsBDCHCKpsBECFCKqsBHDNrsBXrsBYqsBaosBZrsBNCFwsBIkhtBE6sBH2sBIzsBKzsBE4sBF4sBF5sBG5sBH2YBgUI2UBgED8TLxOH7FH8DD6TOqOS1FKeKxCF3TOpOX6DC1BOZPoCN0TLsOZ6DDxBTUUbIGHIcxTMsOc3DFvBWLiBS9BMUuSLnOmBsDDCLIBJBRBFpCLkDpSKmOuB5CgIpSJgOBEzBMGhCjIqSH9N/BHR3BmIoSI5NhDsBvIjSJzNnDnB3I+RMqMEduDkBhJOBmRQlMIXzDiBpJFG2QFHTiMLR3DhB3JzQHFW/LTJ4DgB8JuQJEX7LZE5DcrKkQKDX0L6EU3KjQLCY3IFBEMIEXgB7EV7KgQMCYzIOJLBbXgFWgL8PMDYtIVGqBC0FVjL4POCZnIkIP8LhPODZ6GFfrIOjMzOYDYsGGGIHNFvINqMrOaFXqGJFvJOtM7KJkDaFXpG9JNwM7KW3CKBNGYmGhKJxM+KVgDIMZjG8WwMB1CbgG+W4KQoBDyCd8FhX5KUjBIFCgClB2FlX8HEOCrCVPLCWUDdvBzFmXgIGKJCD/ByCHQN0ByFmXzIKUEqBqDG4ByFhXoJFGJsBjF4F8WkHFFFMFhBZwB9E5F3WjHiDCGoB1E9F3WgH1DkBxE8F5WzGoEGRGyE6F6WjGHG5J4F9WkGjK4F/WnG6J7FjXoG0J6FqXpGwJvF3XjG1JoFgY/F/I/FjY5EDMDQkJ7FmY5EUIxJwFsY3EwKpFxY3ExKrDDyB4Y4EtKnDPnBgZgEIQ9JzDUiBqZ2DNR5JyDXgBrZ4DNQ3JwDZfmZ/DNWwJvDbe+YqELnBhJqDdfNL9X1EBzB+InDf2B7XwG5I/BEhBiB3B5XzG7I5BIZmB7B3XzGjJfPCIXkBhC1XyGtJZWXehC7XvG2JXIDIbS7BoYtFDIKJgKkEzYwFhLqDoZwFqL5CuZyFuLvBZIyZ1FvLiB9ayF0LWobuF2LOybpF5LH8bjF8LBlc9EqoB2EroB+EloB3BCKRqCsoBgBHDIEYsCpoBCPL1B+C9LwezC0qBaDrBnsBP6ya"

function decodeMask(): Uint8Array {
    const idx: Record<string, number> = {}
    for (let i = 0; i < 64; i++) idx[B64[i]] = i
    const bits = new Uint8Array(MASK_W * MASK_H)
    let k = 0
    let cur = 0
    let i = 0
    while (i < LAND_MASK.length) {
        let v = 0
        let sh = 0
        let c = 0
        do {
            c = idx[LAND_MASK[i++]]
            v |= (c & 31) << sh
            sh += 5
        } while (c & 32)
        if (cur) bits.fill(1, k, k + v)
        k += v
        cur ^= 1
    }
    return bits
}

/**
 * Distance from every land cell to the nearest water cell, in degrees of arc.
 * Two-pass 8-neighbour chamfer; the east-west step is scaled by cos(lat) so a
 * cell near the pole is not counted as far from its coast as one at the
 * equator. Water is 0. Capped at RAMP_DEG — nothing past it is ever read.
 */
let COAST_CACHE: Float32Array | null = null
function coastDistance(): Float32Array {
    if (COAST_CACHE) return COAST_CACHE
    const mask = decodeMask()
    const W = MASK_W
    const H = MASK_H
    const d = new Float32Array(W * H)
    for (let i = 0; i < d.length; i++) d[i] = mask[i] ? RAMP_DEG : 0
    const hx = new Float32Array(H)
    const dg = new Float32Array(H)
    for (let y = 0; y < H; y++) {
        const lat = 90 - (y + 0.5) * MASK_DEG
        hx[y] = MASK_DEG * Math.max(0.05, Math.cos((lat * Math.PI) / 180))
        dg[y] = Math.hypot(hx[y], MASK_DEG)
    }
    const v = MASK_DEG
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x
            let m = d[i]
            if (m === 0) continue
            if (x > 0) m = Math.min(m, d[i - 1] + hx[y])
            if (y > 0) {
                m = Math.min(m, d[i - W] + v)
                if (x > 0) m = Math.min(m, d[i - W - 1] + dg[y])
                if (x < W - 1) m = Math.min(m, d[i - W + 1] + dg[y])
            }
            d[i] = m
        }
    }
    for (let y = H - 1; y >= 0; y--) {
        for (let x = W - 1; x >= 0; x--) {
            const i = y * W + x
            let m = d[i]
            if (m === 0) continue
            if (x < W - 1) m = Math.min(m, d[i + 1] + hx[y])
            if (y < H - 1) {
                m = Math.min(m, d[i + W] + v)
                if (x < W - 1) m = Math.min(m, d[i + W + 1] + dg[y])
                if (x > 0) m = Math.min(m, d[i + W - 1] + dg[y])
            }
            d[i] = m
        }
    }
    COAST_CACHE = d
    return d
}

// ---------------------------------------------------------------------------
// Scene constants
// ---------------------------------------------------------------------------

/** Degrees of inland distance the glyph ramp spans, coast → heaviest glyph. */
const RAMP_DEG = 4
/** Along-row spacing as a fraction of row spacing. Reference: rows sit two
 *  glyph advances apart, glyphs one. */
const COL_RATIO = 0.5
/** Atlas: font size as a fraction of the cell, and a monospace advance in em.
 *  Their product is the ink pitch; the cell is sized so that pitch equals the
 *  along-row spacing and a run of land reads as a word. */
const GLYPH_EM = 0.8
const ADVANCE_EM = 0.6
const ATLAS_GRID = 4
const ATLAS_CELL = 64
const MAX_RAMP = ATLAS_GRID * ATLAS_GRID - 1
const ACCENT_CELL = ATLAS_GRID * ATLAS_GRID - 1
const ACCENT_CHAR = "@"
/** Ocean dot radius as a fraction of the glyph cell, and its opacity. */
const DOT_R = 0.075
/** Smallest radius an ocean dot is drawn at, device px (dimmed by area below). */
const MIN_DOT_PX = 0.9
const OCEAN_ALPHA = 0.32
/** Coast glyphs read lighter than interior ones in the reference. */
const COAST_ALPHA = 0.55
/** Share of interior cells that can flip to the accent, how often they do,
 *  and for what fraction of each cycle. Frozen, not a dial (rule 8b). */
const ACCENT_SHARE = 0.015
const ACCENT_MIN_LAND = 0.35
const TWINKLE_HZ = 0.12
const TWINKLE_ON = 0.45
/** Limb fade width, in cos(view angle). Rows compress toward the limb but
 *  screen-upright glyphs do not, so without a wide fade and a mild shrink
 *  (LIMB_SHRINK = size at the horizon) the rim piles up into a bright wall. */
const LIMB_FADE = 0.5
const LIMB_SHRINK = 0.6
/** Vertical field of view, degrees. */
const FOV = 40
/** Ticks per second at Speed 50. Fast enough that the steps read as a spin,
 *  slow enough that each one still lands and holds. */
const TICKS_AT_50 = 5
/** Pointer follow rate, per second. Was the Cursor > Damping dial (25% of a
 *  30/s maximum); cut to make room for Step + Transition, frozen here. */
const FOLLOW_RATE = 7.5
/** Roll about the view axis, degrees. Was Camera > Side Tilt; cut for the same
 *  reason and frozen at its default. */
const ROLL_DEG = -10
/** Default tick: quick snap with a small settle. */
const DEFAULT_TRANSITION: Transition = { type: "spring", stiffness: 3000, damping: 70, mass: 1 }

const DEFAULT_RAMP = "-=+*o8$"
const DEFAULT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function hash2(i: number, j: number) {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263)
    n = Math.imul(n ^ (n >>> 13), 1274126177)
    n = n ^ (n >>> 16)
    return (n >>> 0) / 4294967296
}

/** Stride 5: x, y, z, land (−1 ocean, else 0..1 of the ramp), seed. */
function buildGlobe(rows: number): Float32Array {
    const dist = coastDistance()
    const latStep = 180 / rows
    const colStep = latStep * COL_RATIO
    const out: number[] = []
    for (let r = 0; r < rows; r++) {
        const lat = -90 + (r + 0.5) * latStep
        const la = (lat * Math.PI) / 180
        const cl = Math.cos(la)
        const sl = Math.sin(la)
        const count = Math.max(1, Math.round((360 * cl) / colStep))
        // Half-step stagger per row, so the columns do not line up into
        // meridians the reference never drew.
        const phase = r % 2 ? 0.5 : 0
        const j = Math.min(MASK_H - 1, Math.max(0, Math.floor((90 - lat) / MASK_DEG)))
        for (let k = 0; k < count; k++) {
            const lon = -180 + ((k + phase) * 360) / count
            const lo = (lon * Math.PI) / 180
            const i = Math.min(MASK_W - 1, Math.max(0, Math.floor((lon + 180) / MASK_DEG)))
            const dd = dist[j * MASK_W + i]
            const land = dd > 0 ? Math.min(1, dd / RAMP_DEG) : -1
            out.push(cl * Math.sin(lo), sl, cl * Math.cos(lo), land, hash2(r, k))
        }
    }
    return new Float32Array(out)
}

// ---------------------------------------------------------------------------
// Colour — Framer's Color control emits rgb()/hsl()/var(), not only hex.
// ---------------------------------------------------------------------------

type RGB = [number, number, number]

function parseColor(input: string | undefined, fallback: RGB): RGB {
    if (!input) return fallback
    let s = String(input).trim()
    const vm = s.match(/^var\(\s*--[^,]+,\s*(.+)\)$/)
    if (vm) s = vm[1].trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length < 6) return fallback
        const n = parseInt(h.slice(0, 6), 16)
        if (!Number.isFinite(n)) return fallback
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    const rm = s.match(/^rgba?\(([^)]+)\)$/i)
    if (rm) {
        const p = rm[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite))
            return [p[0] / 255, p[1] / 255, p[2] / 255]
        return fallback
    }
    const hm = s.match(/^hsla?\(([^)]+)\)$/i)
    if (hm) {
        const p = hm[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) {
            const h = (((p[0] % 360) + 360) % 360) / 360
            const sat = p[1] / 100
            const l = p[2] / 100
            const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat
            const pp = 2 * l - q
            const f = (t: number) => {
                if (t < 0) t += 1
                if (t > 1) t -= 1
                if (t < 1 / 6) return pp + (q - pp) * 6 * t
                if (t < 1 / 2) return q
                if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6
                return pp
            }
            return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
        }
    }
    return fallback
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VS = `#version 300 es
precision highp float;
in vec2 aCorner;
in vec3 aPos;
in float aLand;
in float aSeed;
uniform mat3 uRot;
uniform float uCamD;
uniform float uTanY;
uniform float uAspect;
uniform float uOffY;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uReach;
uniform float uHole;
uniform float uCellPx;
uniform float uRampN;
uniform float uTime;
out vec2 vUv;
flat out float vCell;
flat out float vKind;
flat out float vAlpha;
flat out float vDotR;
flat out float vBox;
void main() {
    vec3 p = uRot * aPos;
    float depth = uCamD - p.z;
    // cos of the angle between the surface normal and the ray to the camera.
    float facing = (uCamD * p.z - 1.0) / max(depth, 1e-4);
    vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
    if (facing <= 0.0) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vCell = 0.0; vKind = 0.0; vAlpha = 0.0; vDotR = 0.0; vBox = 1.0;
        return;
    }
    vec2 ndc = vec2(p.x / (depth * uTanY * uAspect), p.y / (depth * uTanY) + uOffY);
    vec2 s = (ndc * 0.5 + 0.5) * uRes;

    // Screen-space repel. d -> d + h(1 - d/R)^2 is monotonic while h <= R/2.
    vec2 v = s - uMouse;
    float d = length(v);
    if (uHole > 0.0 && d < uReach) {
        float k = 1.0 - d / uReach;
        vec2 dir = d > 1e-3 ? v / d : vec2(0.0, 1.0);
        s = uMouse + dir * (d + uHole * k * k);
    }

    float cell = uCellPx / depth * mix(${LIMB_SHRINK.toFixed(3)}, 1.0, facing);
    float fade = smoothstep(0.0, ${LIMB_FADE.toFixed(3)}, facing);
    float box = cell;
    vDotR = 0.0;
    if (aLand < 0.0) {
        vKind = 0.0;
        vCell = 0.0;
        vAlpha = ${OCEAN_ALPHA.toFixed(3)} * fade;
        // The dot only needs its own footprint plus the AA ramp, not the
        // whole glyph cell — ocean is most of the globe.
        vDotR = cell * ${DOT_R.toFixed(3)};
        box = 2.0 * max(vDotR, ${MIN_DOT_PX.toFixed(2)}) + 3.0;
    } else {
        vKind = 1.0;
        vCell = min(floor(aLand * uRampN), uRampN - 1.0);
        vAlpha = mix(${COAST_ALPHA.toFixed(3)}, 1.0, aLand) * fade;
        if (aSeed < ${ACCENT_SHARE.toFixed(4)} && aLand > ${ACCENT_MIN_LAND.toFixed(3)}) {
            float ph = fract(aSeed * 977.0 + uTime * ${TWINKLE_HZ.toFixed(3)});
            if (ph < ${TWINKLE_ON.toFixed(3)}) {
                vKind = 2.0;
                vCell = ${ACCENT_CELL.toFixed(1)};
                vAlpha = fade;
            }
        }
    }
    vBox = box;
    s += aCorner * box;
    gl_Position = vec4(s / uRes * 2.0 - 1.0, 0.0, 1.0);
}
`

const FS = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uBase;
uniform vec3 uAccent;
in vec2 vUv;
flat in float vCell;
flat in float vKind;
flat in float vAlpha;
flat in float vDotR;
flat in float vBox;
out vec4 outColor;
void main() {
    float a;
    vec3 col = uBase;
    if (vKind < 0.5) {
        // Box-filtered disc in device px: a 1px linear ramp is the pixel
        // coverage of the edge, so the lit area moves with the dot instead of
        // hopping between pixels. Below MIN_DOT_PX the disc is held at that
        // radius and dimmed by area, so a tiny dot never flickers.
        float d = length(vUv - 0.5) * vBox;
        float r = max(vDotR, ${MIN_DOT_PX.toFixed(2)});
        float area = min(1.0, (vDotR * vDotR) / (r * r));
        a = clamp(r + 0.5 - d, 0.0, 1.0) * area;
    } else {
        const float G = ${ATLAS_GRID.toFixed(1)};
        vec2 cell = vec2(mod(vCell, G), floor(vCell / G));
        a = texture(uAtlas, (cell + vUv) / G).a;
        if (vKind > 1.5) col = uAccent;
    }
    a *= vAlpha;
    if (a < 0.002) discard;
    outColor = vec4(col * a, a);
}
`

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FontLike {
    fontFamily?: string
    fontWeight?: string | number
    fontStyle?: string
}

interface GlyphGroup {
    font?: FontLike
    ramp?: string
}
interface CursorGroup {
    reach?: number
    lift?: number
}
interface CameraGroup {
    tiltStart?: number
    offsetY?: number
}

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    speed?: number
    direction?: "cw" | "ccw"
    step?: number
    transition?: Transition
    distance?: number
    glyphs?: GlyphGroup
    cursor?: CursorGroup
    camera?: CameraGroup
    style?: React.CSSProperties
}

const DEFAULT_GLYPHS: Required<GlyphGroup> = {
    font: { fontFamily: DEFAULT_FAMILY, fontWeight: 500, fontStyle: "normal" },
    ramp: DEFAULT_RAMP,
}
const DEFAULT_CURSOR: Required<CursorGroup> = { reach: 28, lift: 80 }
const DEFAULT_CAMERA: Required<CameraGroup> = { tiltStart: 22, offsetY: 0 }

function rampChars(s: string | undefined): string[] {
    const chars = Array.from(String(s ?? "")).filter((c) => c.trim() !== "")
    const out = chars.length ? chars : Array.from(DEFAULT_RAMP)
    return out.slice(0, MAX_RAMP)
}

/**
 * ASCII Globe
 */
export default function AsciiGlobe(props: Props) {
    const {
        background = "#000000",
        baseColor = "#CFD0D3",
        accentColor = "#E27A3A",
        density = 48,
        dotSize = 68,
        speed = -100,
        direction = "cw",
        step = 1,
        transition = {"mass":1,"type":"spring","delay":0.05,"damping":60,"stiffness":800},
        distance = 474,
        style,
    } = props
    // A group the designer never opened arrives undefined — spread over typed
    // defaults so every field has its own fallback.
    const glyphs = { ...DEFAULT_GLYPHS, ...(props.glyphs ?? {}) }
    const cursor = { ...DEFAULT_CURSOR, ...(props.cursor ?? {}) }
    const camera = { ...DEFAULT_CAMERA, ...(props.camera ?? {}) }
    const font = { ...DEFAULT_GLYPHS.font, ...(glyphs.font ?? {}) }

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const live = useRef({
        base: [0.8, 0.8, 0.8] as RGB,
        accent: [0.9, 0.5, 0.2] as RGB,
        rows: 80,
        dotSize: 100,
        speed: 50,
        distance: 320,
        reach: 28,
        lift: 80,
        step: 4,
        transition: DEFAULT_TRANSITION as Transition,
        tilt: 22,
        offsetY: 0,
        atlasKey: "",
        family: DEFAULT_FAMILY,
        weight: "500" as string,
        fstyle: "normal",
        ramp: Array.from(DEFAULT_RAMP),
    })
    const L = live.current
    L.base = parseColor(baseColor, [0.81, 0.82, 0.83])
    L.accent = parseColor(accentColor, [0.89, 0.48, 0.23])
    L.rows = Math.max(10, Math.round(density))
    L.dotSize = Math.max(1, dotSize)
    L.speed = direction === "ccw" ? -speed : speed
    L.distance = Math.max(105, distance)
    L.reach = Math.max(0, cursor.reach ?? DEFAULT_CURSOR.reach)
    L.lift = Math.max(0, Math.min(100, cursor.lift ?? DEFAULT_CURSOR.lift))
    L.step = step
    L.transition = transition || DEFAULT_TRANSITION
    L.tilt = camera.tiltStart ?? DEFAULT_CAMERA.tiltStart
    L.offsetY = camera.offsetY ?? DEFAULT_CAMERA.offsetY
    L.family = font.fontFamily || DEFAULT_FAMILY
    L.weight = String(font.fontWeight ?? 500)
    L.fstyle = font.fontStyle || "normal"
    L.ramp = rampChars(glyphs.ramp)
    L.atlasKey = [L.family, L.weight, L.fstyle, L.ramp.join("")].join("|")

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: true,
            premultipliedAlpha: true,
        })
        if (!gl) return

        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                console.error("AsciiGlobe shader:", gl.getShaderInfoLog(s))
            return s
        }
        const prog = gl.createProgram()!
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
            console.error("AsciiGlobe link:", gl.getProgramInfoLog(prog))
        gl.useProgram(prog)

        const U = (n: string) => gl.getUniformLocation(prog, n)
        const u = {
            rot: U("uRot"),
            camD: U("uCamD"),
            tanY: U("uTanY"),
            aspect: U("uAspect"),
            offY: U("uOffY"),
            res: U("uRes"),
            mouse: U("uMouse"),
            reach: U("uReach"),
            hole: U("uHole"),
            cellPx: U("uCellPx"),
            rampN: U("uRampN"),
            time: U("uTime"),
            atlas: U("uAtlas"),
            base: U("uBase"),
            accent: U("uAccent"),
        }

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)
        const cornerBuf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
            gl.STATIC_DRAW
        )
        const aCorner = gl.getAttribLocation(prog, "aCorner")
        gl.enableVertexAttribArray(aCorner)
        gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        const stride = 5 * 4
        const inst = (name: string, size: number, offset: number) => {
            const loc = gl.getAttribLocation(prog, name)
            gl.enableVertexAttribArray(loc)
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset)
            gl.vertexAttribDivisor(loc, 1)
        }
        inst("aPos", 3, 0)
        inst("aLand", 1, 12)
        inst("aSeed", 1, 16)

        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.uniform1i(u.atlas, 0)

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

        // ---- atlas. Redrawn against a key inside the loop, never from React
        // state; a webfont not yet in the document is loaded once and the key
        // cleared so the next frame redraws with it.
        const atlas = document.createElement("canvas")
        atlas.width = atlas.height = ATLAS_GRID * ATLAS_CELL
        const actx = atlas.getContext("2d")!
        let atlasKey = ""
        const fontsAsked = new Set<string>()
        const drawAtlas = () => {
            const S = live.current
            const px = Math.round(ATLAS_CELL * GLYPH_EM)
            const spec = `${S.fstyle} ${S.weight} ${px}px ${S.family}`
            if (!fontsAsked.has(spec) && document.fonts && document.fonts.load) {
                fontsAsked.add(spec)
                document.fonts
                    .load(spec, S.ramp.join("") + ACCENT_CHAR)
                    .then(() => {
                        atlasKey = ""
                    })
                    .catch(() => {})
            }
            actx.clearRect(0, 0, atlas.width, atlas.height)
            actx.fillStyle = "#fff"
            actx.textAlign = "center"
            actx.textBaseline = "middle"
            const put = (ch: string, cell: number) => {
                const cx = (cell % ATLAS_GRID) * ATLAS_CELL + ATLAS_CELL / 2
                const cy = Math.floor(cell / ATLAS_GRID) * ATLAS_CELL + ATLAS_CELL / 2
                actx.font = spec
                const w = actx.measureText(ch).width
                // Shrink anything wider than the padded cell so it never bleeds
                // into its neighbour at a coarse mip.
                const lim = ATLAS_CELL * 0.86
                if (w > lim) actx.font = `${S.fstyle} ${S.weight} ${Math.floor((px * lim) / w)}px ${S.family}`
                actx.fillText(ch, cx, cy)
            }
            S.ramp.forEach((c, i) => put(c, i))
            put(ACCENT_CHAR, ACCENT_CELL)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
            gl.generateMipmap(gl.TEXTURE_2D)
        }

        let rowsBuilt = 0
        let count = 0

        let cssW = 1
        let cssH = 1
        let dpr = 1
        const resize = () => {
            // clientWidth, not the injected size props (not numeric in preview)
            // and not getBoundingClientRect (carries the canvas zoom).
            cssW = Math.max(1, root.clientWidth || root.offsetWidth || 1200)
            cssH = Math.max(1, root.clientHeight || root.offsetHeight || 800)
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.max(1, Math.round(cssW * dpr))
            canvas.height = Math.max(1, Math.round(cssH * dpr))
        }
        const ro = new ResizeObserver(resize)
        ro.observe(root)
        resize()

        // ---- pointer, in CSS px of the root, zoom-corrected: the rect is
        // scaled by the canvas zoom, offsetWidth is not.
        let tx = 0
        let ty = 0
        let inside = false
        const onMove = (e: PointerEvent) => {
            const r = root.getBoundingClientRect()
            const sx = r.width > 0 ? root.offsetWidth / r.width : 1
            const sy = r.height > 0 ? root.offsetHeight / r.height : 1
            tx = (e.clientX - r.left) * sx
            ty = (e.clientY - r.top) * sy
            inside = true
        }
        const onLeave = () => {
            inside = false
        }
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerenter", onMove)
        root.addEventListener("pointerleave", onLeave)

        let mx = -1e4
        let my = -1e4
        let presence = 0
        // Spin, degrees. `target` is where the last tick sent it, `spin` the
        // tweened value the frame draws. Unbounded in float64 — harmless.
        let spin = 0
        let target = 0
        let tickClock = 0
        let tween: { stop: () => void } | null = null
        // Angular velocity, deg/s, measured off the drawn angle. Handed to the
        // next tick's spring so a tick that interrupts a still-settling one
        // carries on instead of restarting from rest.
        let spinPrev = 0
        let spinVel = 0
        let time = 0
        let prev = 0
        let raf = 0
        const rot = new Float32Array(9)

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame)
            // The first rAF timestamp can precede the effect: clamp dt at 0.
            const dt = prev === 0 ? 0 : Math.min(0.05, Math.max(0, (now - prev) / 1000))
            prev = now
            const S = live.current

            if (S.rows !== rowsBuilt) {
                rowsBuilt = S.rows
                const data = buildGlobe(S.rows)
                count = data.length / 5
                gl.bindBuffer(gl.ARRAY_BUFFER, buf)
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
            }
            if (S.atlasKey !== atlasKey) {
                atlasKey = S.atlasKey
                drawAtlas()
            }

            time += dt
            if (dt > 0) spinVel = (spin - spinPrev) / dt
            spinPrev = spin
            const rate = (Math.abs(S.speed) / 50) * TICKS_AT_50
            if (rate > 0) {
                tickClock += dt * rate
                if (tickClock >= 1) {
                    // One tick per frame at most, and no backlog: a tab that
                    // was hidden resumes ticking, it does not spin to catch up.
                    tickClock = Math.min(tickClock - 1, 0.5)
                    target += Math.sign(S.speed) * S.step
                    tween?.stop()
                    // Framer's Transition union carries `type: false` and a
                    // nested `from`; neither is emitted by the control.
                    const spec = S.transition as Exclude<Transition, { type: false }> & {
                        from?: unknown
                    }
                    const { from: _from, ...opts } = spec
                    tween = animate(spin, target, {
                        ...opts,
                        velocity: spinVel,
                        onUpdate: (v: number) => {
                            spin = v
                        },
                    })
                }
            }

            // Pointer easing: position and presence both settle at the same
            // rate, so the parting opens and closes instead of snapping.
            const follow = 1 - Math.exp(-dt * FOLLOW_RATE)
            if (inside) {
                if (presence < 0.001) {
                    mx = tx
                    my = ty
                } else {
                    mx += (tx - mx) * follow
                    my += (ty - my) * follow
                }
            }
            presence += ((inside ? 1 : 0) - presence) * follow

            // R = Rz(roll) · Rx(tilt) · Ry(spin), column-major for GLSL.
            const a = (spin * Math.PI) / 180
            const b = (S.tilt * Math.PI) / 180
            const c = (ROLL_DEG * Math.PI) / 180
            const ca = Math.cos(a), sa = Math.sin(a)
            const cb = Math.cos(b), sb = Math.sin(b)
            const cc = Math.cos(c), sc = Math.sin(c)
            // Ry
            const y00 = ca, y02 = sa, y20 = -sa, y22 = ca
            // Rx·Ry
            const m00 = y00, m01 = 0, m02 = y02
            const m10 = -sb * y20, m11 = cb, m12 = -sb * y22
            const m20 = cb * y20, m21 = sb, m22 = cb * y22
            // Rz·(Rx·Ry)
            const r00 = cc * m00 - sc * m10, r01 = cc * m01 - sc * m11, r02 = cc * m02 - sc * m12
            const r10 = sc * m00 + cc * m10, r11 = sc * m01 + cc * m11, r12 = sc * m02 + cc * m12
            rot[0] = r00; rot[1] = r10; rot[2] = m20
            rot[3] = r01; rot[4] = r11; rot[5] = m21
            rot[6] = r02; rot[7] = r12; rot[8] = m22

            const W = canvas.width
            const H = canvas.height
            const camD = S.distance / 100
            const tanY = Math.tan(((FOV / 2) * Math.PI) / 180)
            const focal = H / 2 / tanY
            // Silhouette radius on screen — Reach is a percent of it.
            const globePx = focal * Math.tan(Math.asin(Math.min(0.999, 1 / camD)))
            const reachPx = (globePx * S.reach) / 100
            const colRad = ((180 / S.rows) * COL_RATIO * Math.PI) / 180
            const cellWorld = colRad / (GLYPH_EM * ADVANCE_EM)

            gl.viewport(0, 0, W, H)
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(prog)
            gl.bindVertexArray(vao)
            gl.uniformMatrix3fv(u.rot, false, rot)
            gl.uniform1f(u.camD, camD)
            gl.uniform1f(u.tanY, tanY)
            gl.uniform1f(u.aspect, W / H)
            gl.uniform1f(u.offY, -S.offsetY / 50)
            gl.uniform2f(u.res, W, H)
            gl.uniform2f(u.mouse, mx * dpr, H - my * dpr)
            gl.uniform1f(u.reach, Math.max(1, reachPx))
            gl.uniform1f(u.hole, ((reachPx / 2) * S.lift * presence) / 100)
            gl.uniform1f(u.cellPx, (cellWorld * S.dotSize * focal) / 100)
            gl.uniform1f(u.rampN, S.ramp.length)
            gl.uniform1f(u.time, time)
            gl.uniform3f(u.base, S.base[0], S.base[1], S.base[2])
            gl.uniform3f(u.accent, S.accent[0], S.accent[1], S.accent[2])
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, tex)
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            tween?.stop()
            ro.disconnect()
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerenter", onMove)
            root.removeEventListener("pointerleave", onLeave)
            // No WEBGL_lose_context: getContext hands back the same context for
            // this canvas, so a force-lost one survives a StrictMode remount
            // and renders black.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Before the spread, so an explicit size on the instance wins.
                minWidth: 1200,
                minHeight: 800,
                position: "relative",
                overflow: "hidden",
                background,
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

AsciiGlobe.displayName = "ASCII Globe"
