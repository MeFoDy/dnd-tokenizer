import * as fabric from 'fabric';

const canvasContainer = document.querySelector('.canvas-container');
const w = canvasContainer?.clientWidth || 1000;
const h = canvasContainer?.clientHeight || 1000;

const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;