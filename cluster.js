const {
    Cluster
} = require('puppeteer-cluster');

const fs = require('fs');

const MAIN_URL = new URL('https://www.johnmurch.com'); // be sure to use the correct URL to start, or it throws an error!
let sitemap = []; // all URLs
var visitedURL = []; // tracking the pages that have been crawled
var links = [];
const limitCrawl = 1000; // Set Crawl limit as this script is focusing on spidering small sites (could handle larger, but recommend a database (redis) integration for that)

function isPage(url) {
    if ((url.endsWith('.pdf') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.css')) || (url.indexOf('fonts.googleapis.com') > -1)) {
        return false
    } else {
        return true
    }
}

async function run(){
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 4,
        monitor: false,
    });
    console.time('crawler'); // Start the clock 🕛
    var gotoPage = null;
    // Extracts document.title of the crawled pages
    await cluster.task(async ({
        page,
        data: url
    }) => {
        try {
            gotoPage = await page.goto(url, {
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
            if(gotoPage.status()==200){
                console.log("\x1b[34m%s\x1b[0m", `🤖: ${gotoPage.status()} ${gotoPage.url()}`)
            }else{ // todo: fix these urls
                console.log("\x1b[31m%s\x1b[0m", `🤖: ${gotoPage.status()} ${gotoPage.url()}`)
            }
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
            console.error('*ERROR*', url, e)
        }

        if (gotoPage !== null) { // only care about pages that are not errors, grab all them links!
            const hostname = await page.evaluate(() => window.location.hostname);
            if (hostname == MAIN_URL.hostname) { // limit to the hostname of the seed URL
                const hrefs = await page.evaluate(
                    () => Array.from(document.body.querySelectorAll('a[href]'), ({
                        href
                    }) => href)
                );
                for (const href of hrefs) {
                    if (new RegExp('^(https?:\/\/)?' + hostname).test(href)) { // limit to actual URLs
                        if (isPage(href)) {
                            links.push(href.replace(/#.*/, ''));
                        }
                    }
                }
            }
        }
        visitedURL.push(url);
        uniqueLinks = [...new Set(links)];
        for await (l of uniqueLinks){
            if(!sitemap.includes(l)){
                sitemap.push(l)
                cluster.queue(l)
            }
        }
    });

    // In case of problems, log them
    cluster.on('taskerror', (err, data) => {
        console.log(`  Error crawling ${data}: ${err.message}`);
    });

    cluster.queue(MAIN_URL.href)


    await cluster.idle();
    await cluster.close();    
    sitemap = sitemap.sort() // lets sort so the output is clean!
    console.log('--------------------------------------------------------')
    console.timeEnd('crawler');
    console.info(sitemap.length, ' Pages')
    console.info("URLS", JSON.stringify(sitemap, null, 4))
    console.log('--------------------------------------------------------')
    // fs.writeFileSync(MAIN_URL.hostname+".txt", sitemap)
    fs.writeFileSync(MAIN_URL.hostname + ".txt", sitemap.join().replace(/,/g, '\n'), () => {});
  
}
run();