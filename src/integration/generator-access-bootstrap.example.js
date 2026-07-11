// Zkopírujte do cílové aplikace jako access-bootstrap.js.
// Upravte APP_ID a cestu v posledním importu.
import { protectApp } from 'https://daniel22-dev.github.io/AI-Studio-GHRAB/access/app-guard.js';

const APP_ID = 'generator'; // generator | differentiator | essay-evaluator | ludus | correspondence
const allowed = await protectApp(APP_ID, {
  studioUrl: 'https://daniel22-dev.github.io/AI-Studio-GHRAB/'
});

if (allowed) {
  await import('./app.js'); // cesta k původnímu vstupnímu modulu cílové aplikace
}
