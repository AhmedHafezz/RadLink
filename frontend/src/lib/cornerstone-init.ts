'use client';

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Cornerstone3D and its tools.
 * Safe to call multiple times — subsequent calls return the cached promise.
 */
export async function initCornerstone(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const [cornerstone, cornerstoneTools, cornerstoneDICOMImageLoader, dicomParserModule] =
        await Promise.all([
          import('@cornerstonejs/core'),
          import('@cornerstonejs/tools'),
          import('@cornerstonejs/dicom-image-loader'),
          import('dicom-parser'),
        ]);

      // Initialize core rendering engine
      await cornerstone.init();

      // Wire up the DICOM image loader
      cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
      cornerstoneDICOMImageLoader.external.dicomParser = dicomParserModule.default ?? dicomParserModule;

      cornerstoneDICOMImageLoader.configure({
        useWebWorkers: true,
        decodeConfig: {
          convertFloatPixelDataToInt: false,
          use16BitDataType: true,
        },
      });

      // Initialize tools library
      cornerstoneTools.init();

      // Register all tools we will use
      const {
        WindowLevelTool,
        ZoomTool,
        PanTool,
        LengthTool,
        AngleTool,
        EllipticalROITool,
        RectangleROITool,
        StackScrollMouseWheelTool,
        StackScrollTool,
        MagnifyTool,
        ArrowAnnotateTool,
      } = cornerstoneTools;

      const toolsToAdd = [
        WindowLevelTool,
        ZoomTool,
        PanTool,
        LengthTool,
        AngleTool,
        EllipticalROITool,
        RectangleROITool,
        StackScrollMouseWheelTool,
        StackScrollTool,
        MagnifyTool,
        ArrowAnnotateTool,
      ];

      for (const tool of toolsToAdd) {
        try {
          cornerstoneTools.addTool(tool);
        } catch {
          // Tool may already be registered across HMR reloads
        }
      }

      initialized = true;
      console.log('[RadLink] Cornerstone3D initialized successfully');
    } catch (error) {
      initPromise = null; // allow retry
      console.error('[RadLink] Failed to initialize Cornerstone3D:', error);
      throw error;
    }
  })();

  return initPromise;
}

export function isInitialized(): boolean {
  return initialized;
}

/** Reset initialization state (useful for testing). */
export function resetInitialization(): void {
  initialized = false;
  initPromise = null;
}
