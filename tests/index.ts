import { runCanvasDimensionTests } from './canvasDimensions.test';
import { runCanvasDrawingTests } from './canvasDrawing.test';
import { runArrowUtilsTests } from './arrowUtils.test';
import { runZoomTests } from './zoom.test';
import { runPresetsDataTests } from './presetsData.test';
import { runPresetLogicTests } from './presetLogic.test';
import { runHistoryTests } from './history.test';
import { runAppContextTests } from './appContext.test';
import { runBackgroundSettingsTests } from './backgroundSettings.test';
import { runAnnotationEventsTests } from './annotationEvents.test';
import { runComponentsTests } from './components.test';

console.log('--- Running Achu Unit Tests ---\n');

try {
  console.log('=== Canvas Dimensions ===');
  runCanvasDimensionTests();
  console.log('');

  console.log('=== Canvas Drawing ===');
  runCanvasDrawingTests();
  console.log('');

  console.log('=== Arrow Utils ===');
  runArrowUtilsTests();
  console.log('');

  console.log('=== Zoom ===');
  runZoomTests();
  console.log('');

  console.log('=== Presets Data ===');
  runPresetsDataTests();
  console.log('');

  console.log('=== Preset Logic ===');
  runPresetLogicTests();
  console.log('');

  console.log('=== History ===');
  runHistoryTests();
  console.log('');

  console.log('=== AppContext ===');
  runAppContextTests();
  console.log('');

  console.log('=== Background Settings ===');
  runBackgroundSettingsTests();
  console.log('');

  console.log('=== Annotation Events ===');
  runAnnotationEventsTests();
  console.log('');

  console.log('=== Components ===');
  runComponentsTests();
  console.log('');

  console.log('--- All Tests Passed Successfully! ---');
  process.exit(0);
} catch (e) {
  console.error('\nTest verification failed:', e);
  process.exit(1);
}
