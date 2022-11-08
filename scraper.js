const axios = require('axios');
const cheerio = require('cheerio');
const playwright = require("playwright");
const useHeadless = false; // "true" to use playwright
let allProducts = [];
const visited = new Set();

const getHtml = async url => {
    return useHeadless ? await getHtmlPlaywright(url) : await getHtmlAxios(url);
};
const getHtmlPlaywright = async url => {
    const browser = await playwright.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    const html = await page.content();
    await browser.close();

    return html;
};
const getHtmlAxios = async url => {
    const { data } = await axios.get(url);

    return data;
};
const extractLinks = ($, attribute) => [
    ...new Set(
        $(attribute)
                .map((_, a) => $(a).attr('href'))
                .toArray()
        )
    ]
const extractContent = $ => {
    const descriptionTitle = $('#descriptionTabContent').find('h3').text();
    const descriptionContent = $('#descriptionTabContent').find('p').text();
    const deliveryServices = $('#deliveryTabContent .delivery-service');
    const deliveryServicesForReturn = [];
    const arrayWithImagesUrls = [];
    const allImages = $('#product-thumbnails a');
    const allPrices = $('.prices');
    let save = allPrices.find('.saving').text();
    let arrFromSave = save.split(' ');
    let ratingCountAllInfo = allPrices.find('.ratings-count').text();
    allImages.map((_,currentLinkWithImage)=>{
        const $currentLinkWithImage = $(currentLinkWithImage);
        arrayWithImagesUrls.push($currentLinkWithImage.find('img').attr('src'));
    });
    deliveryServices.map((_, currentService)=>{
        const $currentService = $(currentService);
        let curService = $currentService.find('.delivery-type').find('b').text();
        let shippingCost = $currentService.find('.delivery-price').find('b').text();
        let deliveryAim = $currentService.find('.delivery-expectation').text();
        deliveryServicesForReturn.push({
            service: curService,
            shipping_cost: shippingCost,
            delivery_aim: deliveryAim,
        })
    })

            return {
                product_name  : $('#productDetails').find('h1').find('span:nth-child(1)').text(),
                product_images: arrayWithImagesUrls,
                product_price : allPrices.find('#basePrice').text(),
                product_regular_price: allPrices.find('.rrp').find('.strike').text(),
                save: arrFromSave[1],
                save_percentage: arrFromSave[2],
                product_details: descriptionTitle + descriptionContent,
                delivery: JSON.stringify(deliveryServicesForReturn),
                product_rating: allPrices.find('.ratings').find('span').text(),
                reviews_count: +(ratingCountAllInfo.replace(/[^0-9]/g,"")),//NUMBER!!!!
            }
}
const crawl = async (url, val) => {
   const html = await getHtml(url);
    const $ = cheerio.load(html);
    if(val === 1 && !visited.has(url)){
        visited.add(url);
        console.log(visited);
        const dataTotalPages = $('[data-total-pages]');
        if(dataTotalPages){
            const dataTotalPagesVal = dataTotalPages.attr('data-total-pages');
            let tempArr = [];
            for(let x = 1; x <= dataTotalPagesVal; x++){
                tempArr.push(url + `?page=${x}`);
            }
            tempArr.forEach((link, i) => i === 1 ? crawl(link, 2) : ''); //Limited
        }
    }
    if(val === 2 && !visited.has(url)){
        visited.add(url);
        const itemsLinks = extractLinks($, '.list-item .list-item-buttons a');
        itemsLinks.forEach(link => crawl(link, 3));
    }
    if(val === 3 && !visited.has(url)){
        visited.add(url);
            const content = extractContent($);
            content.product_url = url;
            allProducts.push(content);
        console.log(content);
    }
};

axios.get('https://www.allbeauty.com/gb/en/').then(({ data }) => {
    const $ = cheerio.load(data); // Initialize cheerio
    const cataloguesLinks = extractLinks($, '[data-ga-category="MainMenu-Women"]');
    cataloguesLinks.forEach((link, i) => i === 1 ? crawl(link, 1) : '');//Limited
});

