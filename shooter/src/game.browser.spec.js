import {test,expect} from '@playwright/test';
test('Starfall: renderer, start, shots, bomb, pause and retry',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3101');
  await expect(page.locator('.phaser-host canvas')).toBeVisible();
  await page.screenshot({path:'test-results/shooter-title.png',fullPage:true});
  await page.getByRole('button',{name:/出撃する/}).click();await expect(page.locator('.flight-overlay')).toHaveCount(0);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');
  await page.getByRole('button',{name:/ボムを使う/}).click();await expect(page.locator('.bombs .available')).toHaveCount(1);
  await page.waitForTimeout(3000);await page.screenshot({path:'test-results/shooter-playing.png',fullPage:true});
  await page.getByRole('button',{name:'Ⅱ 一時停止',exact:true}).click();await expect(page.getByRole('heading',{name:'PAUSED'})).toBeVisible();
  await page.locator('.flight-overlay').getByRole('button',{name:'飛行を再開',exact:true}).click();await expect(page.locator('.flight-overlay')).toHaveCount(0);
  await page.keyboard.press('p');await expect(page.getByRole('heading',{name:'PAUSED'})).toBeVisible();await page.getByRole('button',{name:'最初から',exact:true}).click();await expect(page.locator('.bombs .available')).toHaveCount(2);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.phaser-host canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/shooter-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
