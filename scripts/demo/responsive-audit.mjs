/**
 * Small independent responsive smoke test using real Chromium.
 * This is not a full accessibility audit.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve('artifacts/clearcart-demo/mobile');
await mkdir(dir,{recursive:true});
const port = 3467, base = 'http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['scripts/serve.mjs'],{
 env:{...process.env,PORT:String(port),HOST:'127.0.0.1',PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:''},
 stdio:'pipe'
});
server.on('error',e=>{console.error('server error',e);});
let browser;
const results=[];
try {
 let healthy=false;
 for(let i=0;i<50;i++){try{const resp=await fetch(base+'/api/config');if(resp.ok){healthy=true;break;}}catch{}await sleep(350);}
 if(!healthy)throw Error('mobile QA server was not available');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [name,width,height,isMobile] of [
  ['phone-390',390,844,true],['narrow-320',320,720,true],['tablet-768',768,1024,true],['desktop-1440',1440,900,false]
 ]){
  const context=await browser.newContext({viewport:{width,height},isMobile,deviceScaleFactor:1,hasTouch:isMobile});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#need').waitFor();
  const initial=await page.evaluate(()=>({
   documentWidth:document.documentElement.scrollWidth,
   viewportWidth:document.documentElement.clientWidth,
   connectionOpen:document.querySelector('#sandbox-setup').open,
   mainVisible:!!document.querySelector('#planner')
  }));
  await page.locator('[data-scenario="study"]').click();
  await page.locator('#plan-button').click();
  await page.locator('#plan-content').waitFor({state:'visible'});
  await page.locator('#item-list li').first().waitFor();
  const final=await page.evaluate(()=>({
   documentWidth:document.documentElement.scrollWidth,
   viewportWidth:document.documentElement.clientWidth,
   planItems:document.querySelectorAll('#item-list li').length,
   total:document.querySelector('#total-value').textContent,
   budget:document.querySelector('#budget-value').textContent,
   checkoutDisabled:document.querySelector('#checkout-button').disabled,
   sandboxOpen:document.querySelector('#sandbox-setup').open
  }));
  await page.screenshot({path:path.join(dir,name+'.png'),fullPage:true});
  const pass=initial.documentWidth<=initial.viewportWidth+2 &&
   final.documentWidth<=final.viewportWidth+2 && final.planItems>0 &&
   final.checkoutDisabled && errors.length===0;
  const result={name,width,height,initial,final,errors,pass};
  results.push(result);
  console.log('RESPONSIVE_QA '+JSON.stringify(result));
  await context.close();
 }
 if(results.some(x=>!x.pass))throw Error('Responsive checks failed; see artifacts/clearcart-demo/mobile');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 await writeFile(path.join(dir,'responsive-results.json'),JSON.stringify({dateUTC:new Date().toISOString(),results},null,2)+'\n');
}
