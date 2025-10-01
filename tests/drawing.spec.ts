import { test, expect, Page } from '@playwright/test';

async function getPixelColor(
  page: Page,
  wrapperTestId: string,
  x: number,
  y: number
) {
  const wrapperLocator = page.getByTestId(wrapperTestId);
  const canvasLocator = wrapperLocator.locator('canvas').nth(1);

  return await canvasLocator.evaluate(
    (canvas: HTMLCanvasElement, { x, y }) => {
      if (!canvas.getContext) return '#error';
      const ctx = canvas.getContext('2d');
      if (!ctx) return '#error';
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
      return `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
    },
    { x, y }
  );
}

test.describe('Pixel Art Editor - Core Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should draw a single red pixel on the canvas', async ({ page }) => {
    const canvasWrapperTestId = 'main-canvas-wrapper';
    const primaryColorTriggerTestId = 'primary-color-trigger';
    const newColor = '#ff0000';
    const newColorWithoutHash = 'ff0000';

    await page.getByTestId(primaryColorTriggerTestId).click();
    const sketchPicker = page.getByRole('textbox', { name: 'hex' });
    const hexInput = sketchPicker.first();
    await hexInput.waitFor({ state: 'visible' });
    await hexInput.fill(newColorWithoutHash);

    const canvasWrapper = page.getByTestId(canvasWrapperTestId);
    await canvasWrapper.click();
    const canvas = canvasWrapper.locator('canvas').nth(1);

    const drawX = 10;
    const drawY = 10;

    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found or has no size');

    await canvas.click({
      position: { x: drawX, y: drawY },
      button: 'left',
      delay: 100,
      force: true,
    });

    const pixelColor = await getPixelColor(
      page,
      canvasWrapperTestId,
      drawX,
      drawY
    );
    expect(pixelColor).toBe(newColor);
  });

  test('should erase a pixel', async ({ page }) => {
    const canvasWrapperTestId = 'main-canvas-wrapper';
    const eraserToolTestId = 'eraser-tool';

    const canvasWrapper = page.getByTestId(canvasWrapperTestId);
    await canvasWrapper.click();
    const canvas = canvasWrapper.locator('canvas').nth(1);
    const drawX = 15;
    const drawY = 15;
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found or has no size');
    await canvas.click({
      position: { x: drawX, y: drawY },
      button: 'left',
      delay: 100,
      force: true,
    });

    await page.getByTestId(eraserToolTestId).click();

    await canvas.click({
      position: { x: drawX, y: drawY },
      button: 'left',
      delay: 100,
      force: true,
    });

    const pixelAlpha = await canvas.evaluate(
      (canvas: HTMLCanvasElement, { x, y }) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        return ctx.getImageData(x, y, 1, 1).data[3];
      },
      { x: drawX, y: drawY }
    );

    await expect(pixelAlpha).toBe(0);
  });
});
