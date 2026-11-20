import {test,expect} from '@playwright/test';
test('Gomoku: all difficulties reply, thinking stats render, history and undo work',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3100');
  await expect(page.getByRole('heading',{name:'五目並べGOMOKU'})).toBeVisible();
  for(const difficulty of ['Easy','Normal','Hard']){
    await page.getByRole('button',{name:difficulty,exact:true}).click();
    await page.getByRole('button',{name:'H8 空点',exact:true}).click();
    await expect(page.locator('.stone')).toHaveCount(2);
    await expect(page.locator('.ai-stats')).toBeVisible();
  }
  await page.screenshot({path:'test-results/gomoku-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'一手前へ',exact:true}).click();await expect(page.locator('.stone')).toHaveCount(1);
  await page.getByRole('button',{name:'最新へ',exact:true}).click();await expect(page.locator('.stone')).toHaveCount(2);
  await page.getByRole('button',{name:'一手戻す',exact:true}).click();await expect(page.locator('.stone')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.board')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:'test-results/gomoku-mobile.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('Gomoku: restarting during AI calculation cancels stale moves',async({page})=>{
  await page.goto('http://127.0.0.1:3100');await page.getByRole('button',{name:'Hard',exact:true}).click();await page.getByRole('button',{name:'H8 空点',exact:true}).click();await page.getByRole('button',{name:'新しい対局',exact:true}).click();await expect(page.locator('.stone')).toHaveCount(0);await page.waitForTimeout(1200);await expect(page.locator('.stone')).toHaveCount(0);
});
