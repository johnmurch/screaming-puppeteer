# screaming-puppeteer
Simple web spider to capture URLs of a domain


# Why
Every SEO knows of [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/) and I have always been a big fan. It's great for crawling a site but there is a lot of data Screaming Frog is capturing that I do not need and yes you can customize it per crawl, but wanted a simple screaming frog "light" version that uses [Puppeteer](https://github.com/puppeteer/puppeteer), hence Screaming Puppeteer

# Problem
I have a large list of domains that are small sites (under 10k URLs) but have no sitemap. I wanted to generate a list of URLs that can be converted to a sitemap later on.

# Code
There are 2 files in this repo:
* cluster.js
* crawler.js

They are very similar code bases, but the crawler.js is just a single threaded node app (should use for sites with less than 10,000 URLs) and the cluster.js uses concurrency to do the same thing, but faster with more hardware. 

There are pro/cons for each, but wanted to showcase both of them as they are about 100 lines of code and the only real dependency is puppetter and [puppeteer-cluster](https://www.npmjs.com/package/puppeteer-cluster)

The output can easily be removed, but wanted a simple way to see the URL it's crawling, the status code and then the page title and meta description for the page. Additional the time it took to run is outputed at the end above the list of urls.

# What
You provide a seed URL and it fetches the URL and then crawls all links (href) on the page, feeds into a queue and repeats. The final output is a text file with one url per line of the hostname you crawled.

If you have any feedback feel free to hit me up [@johnmurch](https://twitter.com/johnmurch) on twitter

# Install

```npm install```


# Run
Be sure to change the URL in cluster.js or crawler.js

``` node crawler.js```

OR

``` node cluster.js```