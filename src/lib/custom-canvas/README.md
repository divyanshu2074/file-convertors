# Custom Canvas & PDF Annotation Engine (`custom-canvas`)

An ultra-precise, dependency-independent, in-browser 2D vector coordinate mapping and manipulation library designed specifically for PDF rendering and annotation accuracy.

## Architecture

This custom engine solves coordinate drift, rotation desynchronization, aspect-ratio mismatch, and scale-distortion issues between browser DOM/Canvas previews and PDF specification point space (`1 pt = 1/72 inch`, with bottom-left origin `(0, 0)`).

### Core Components

1. **`CoordinateTransformer` (`coords.ts`)**:
   - Manages mathematical transformations between:
     - **Screen Viewport Space** (client pixels, scroll offsets, zoom levels)
     - **DOM Render Container Space** (exact intrinsic layout box of the rendered PDF page)
     - **Normalized Unit Space** (fractional `0.0 .. 1.0` coordinates independent of resolution or DPI)
     - **PDF Specification Point Space** (points `[0..pageWidth, 0..pageHeight]`, taking page media box origin, crop box, and rotation into account).

2. **`VectorShapes` & `CanvasEngine` (`types.ts`, `engine.ts`)**:
   - High-performance drawing engine supporting:
     - **Blackout Redaction Boxes**: Solid permanent erase blocks with drag-to-draw and text-selection targeting.
     - **Freehand Pen & Highlighter**: Smoothed quadratic Bezier curves with opacity and stroke width control.
     - **Vector Shapes**: Rectangles, Ellipses, Arrows, Lines, Star/Callout badges with customizable fill color, outline stroke color, and stroke width.
     - **Rich Text Stamps**: Typography annotations with custom fonts, font sizes, colors, and background badges.
   - Interactive handles: 8-way resize, uniform aspect-ratio lock, rotation, and multi-selection.

3. **`TextLayerExtractor` (`textSelection.ts`)**:
   - Extracts character/token bounding boxes from PDF.js `getTextContent()`, mapping each character span to exact page percentage coordinates.
   - Enables native drag-to-select text redaction (select words/sentences with cursor and click "Redact Selected Text").

4. **`PdfLibAdapter` (`pdfLibAdapter.ts`)**:
   - Serializes shapes and annotations directly into `pdf-lib` drawing operations with zero coordinate drift.
