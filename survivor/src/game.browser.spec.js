import {test,expect} from '@playwright/test';
test('Wildbloom: WebGL terrain, movement, pause, restart and mobile fit',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3102');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();await expect(page.getByRole('button',{name:/森へ踏み出す/})).toBeVisible();
  await page.waitForTimeout(1500);await page.screenshot({path:'test-results/survivor-title.png',fullPage:true});
  await page.getByRole('button',{name:/森へ踏み出す/}).click();await expect(page.locator('.intro-layer')).toHaveCount(0);
  await page.keyboard.down('d');await page.waitForTimeout(700);await page.keyboard.up('d');await page.keyboard.press('Space');
  await page.waitForTimeout(3500);await page.screenshot({path:'test-results/survivor-playing.png',fullPage:true});
  await page.getByRole('button',{name:'一時停止',exact:true}).click();await expect(page.getByRole('heading',{name:'ひとやすみ。'})).toBeVisible();const time=await page.locator('.survival-time strong').innerText();await page.waitForTimeout(300);expect(await page.locator('.survival-time strong').innerText()).toEqual(time);
  await page.getByRole('button',{name:'冒険を続ける',exact:true}).click();await expect(page.locator('.overlay')).toHaveCount(0);await page.keyboard.press('p');await expect(page.getByRole('heading',{name:'ひとやすみ。'})).toBeVisible();await page.getByRole('button',{name:'最初から',exact:true}).click();
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.world-canvas canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/survivor-mobile.png',fullPage:true});expect(errors).toEqual([]);
});
test('Wildbloom: collect an upgrade, choose a build and complete the final phase',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3102');await expect(page.locator('.world-canvas canvas')).toBeVisible();
  // Seed the actual game instance through its class in this test only. No production cheat hooks.
  await page.evaluate(async()=>{const {World}=await import('/src/World.js');const start=World.prototype.start,upgrade=World.prototype.upgrade;
    World.prototype.start=function(){start.call(this);this.state.items.push({id:++this.state.id,x:0,z:0,kind:'upgrade',life:30});};
    World.prototype.upgrade=function(id){upgrade.call(this,id);this.state.time=134.85;};
  });
  await page.getByRole('button',{name:/森へ踏み出す/}).click();await expect(page.getByRole('dialog',{name:'強化を選択'})).toBeVisible();await expect(page.locator('.upgrade-cards button')).toHaveCount(3);
  await page.screenshot({path:'test-results/survivor-upgrade.png',fullPage:true});await page.locator('.upgrade-cards button').first().click();await expect(page.getByRole('heading',{name:'夜明けに、咲く。'})).toBeVisible();await expect(page.locator('.result-stats')).toContainText('02:15');await page.screenshot({path:'test-results/survivor-result.png',fullPage:true});
  await page.getByRole('button',{name:'新しい冒険へ',exact:true}).click();await expect(page.getByRole('heading',{name:'夜明けに、咲く。'})).toHaveCount(0);expect(errors).toEqual([]);
});
