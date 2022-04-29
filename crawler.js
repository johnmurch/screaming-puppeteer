const puppeteer = require('puppeteer');
const fs = require('fs');
const {
  URL
} = require('url');
const MAIN_URL = new URL('https://www.johnmurch.com');
let queue = [MAIN_URL.href]; // main queue for dumping internal links to, seed with url
var visitedURL = []; // tracking the pages that have been crawled
var links = [];
const limitCrawl = 1000; // Set Crawl limit as this script is focusing on spidering small sites (could handle larger, but recommend a database (redis) integration for that)
// Because I really only care about "page" URLs and do not want to see images/css in my list
function isPage(url) {
  if ((url.endsWith('.pdf') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.css')) || (url.indexOf('fonts.googleapis.com') > -1)) {
    return false
  } else {
    return true
  }
}
async function run() {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  console.time('crawler'); // Start the clock 🕛
  // Ignore assets (CSS, JS, IMAGES) only care about URLs that are "pages"
  page.on('request', interceptedRequest => {
    if (isPage(interceptedRequest.url())) {
      interceptedRequest.continue();
    } else {
      interceptedRequest.abort();
    }
  });
  let currentURL;
  let uniqueLinks = [...new Set(queue)];
  while (queue.length > 0 && visitedURL.length < limitCrawl) {
    console.log(`🔗: ${queue[0]}`)
    var gotoPage = null;
    try {
      gotoPage = await page.goto(queue[0], {
        waitUntil: ['load', 'domcontentloaded', 'networkidle2']
      });
      let title = await page.title();
      const description = await page.evaluate(() => {
        let description = ""
        if (document.querySelector(`meta[name='description']`)) {
          description = document.querySelector(`meta[name='description']`).content
        }
        return description
      })
      console.log("\x1b[34m%s\x1b[0m", `🤖: ${gotoPage.status()} ${gotoPage.url()}`)
      if (title != "") {
        console.log("\x1b[32m%s\x1b[0m", `✅: ${title.length}  ${title}`)
      } else {
        console.log("\x1b[31m%s\x1b[0m", `❗: <No Title>`)
      }
      if (description && description != "") {
        console.log("\x1b[32m%s\x1b[0m", `✅: ${description.length}  ${description}`)
      } else {
        console.log("\x1b[31m%s\x1b[0m", `❗: <No Description>`)
      }
    } catch (e) {
      console.error('*ERROR*', queue[0], e)
    };
    if (gotoPage !== null) { // if page has an error, let's skip that url but not break out of the program
      const hostname = await page.evaluate(() => window.location.hostname);
      if (hostname == MAIN_URL.hostname) {
        const hrefs = await page.evaluate(
          () => Array.from(document.body.querySelectorAll('a[href]'), ({
            href
          }) => href)
        );
        for (const href of hrefs) {
          if (new RegExp('^(https?:\/\/)?' + hostname).test(href)) {
            if (isPage(href)) {
              links.push(href.replace(/#.*/, ''));
            }
          }
        }
      }
    }
    currentURL = queue.shift();
    visitedURL.push(currentURL);
    //fs.writeFile("/tmp/visitedURL.csv", visitedURL.join().replace(/,/g, '\n'), () => { });
    uniqueLinks = [...new Set(links)];
    queue = queue.concat(uniqueLinks).filter(v => !visitedURL.includes(v));
  }
  uniqueLinks = uniqueLinks.sort() // sort the Links for output
  await browser.close();
  console.log('--------------------------------------------------------')
  console.timeEnd('crawler');
  console.info(uniqueLinks.length, ' Pages')
  console.info("URLS", JSON.stringify(uniqueLinks, null, 4))
  console.log('--------------------------------------------------------')
  fs.writeFileSync(MAIN_URL.hostname + ".txt", uniqueLinks.join().replace(/,/g, '\n'), () => {});
}
run();