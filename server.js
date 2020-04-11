const puppeteer = require('puppeteer')
const fs = require('fs')
const axios = require('axios')

// Will scrape the TASE website, get a list of ids, for all of the available trust-funds and ETFs
const getFundIds = () => {

    return new Promise(async resolve => {

        // Open the page
        const browser = await puppeteer.launch({'headless': true})
        const page = await browser.newPage()
        await page.goto('https://info.tase.co.il/Heb/MarketData/MutualFunds/Pages/SearchFund.aspx', {waitUntil: 'domcontentloaded'})
    
        // Click on "קרנות נאמנות"
        await Promise.all([
            page.click(`[href*="'2')"`),
            page.waitForNavigation({'waitUntil': 'networkidle2'})
        ])
    
        // Click on "רשימה מלאה"
        await Promise.all([
            page.click(`[href*="submitall"`),
            page.waitForNavigation({'waitUntil': 'networkidle2'})
        ])
    
        // Scrape IDs
        const ids = await page.evaluate(() => {
            const array = Array.from(document.querySelectorAll('a[href*="ObjectID="]'))
            console.log(array.length)
            const ids = array.map(e => {
                const id = e.href.slice(e.href.indexOf('=') + 1)
                if (id [0] === '0') return id.slice(1)
                else return id
            })
            return ids
        })

        await browser.close().then(() => console.log('- IDs scraped successfully'))
        resolve(ids)
    })
}

// Go through all funds and parse them
const parseFunds = fundIds => {

    return new Promise(async resolve => {
        const funds = []
        for (let id of fundIds){

            // Get the fund object
            const fund = await getFundInfo(id)
            if (fund) funds.push(fund)
            else continue
        }

        // Sort the funds by ascending fees
        funds.sort((a, b) => {
            const feeA = a.managementFee + a.trusteeFee + a.variableFee
            const feeB = b.managementFee + b.trusteeFee + b.variableFee

            if (feeA > feeB) return 1
            else if (feeA < feeB) return -1
            else return 0
        })

        // Write to a JSON file
        fs.writeFile('funds.json', JSON.stringify(funds), e => {
            if (e) console.log(e)
            else{
                console.log('- The file has been written successfully')
                resolve()
            }
        })
    })
}

// Get information for a fund
const getFundInfo = id => {
    return new Promise(resolve => {
        axios.get(`https://mayaapi.tase.co.il/api/fund/details?fundId=${id}`, { headers: { 'X-Maya-With': true } })

        // Get results
        .then(res => {

            const data = res.data
            const fund = {
                type: 'fund',
                name: data.FundLongName,
                shortName: data.FundShortName,
                fundID: data.FundId,
                //indicators: data.FundIndicators,
                imitating: data.FundIndicators.find(i => i.Key === 'ImitatingFund').Value,
                classification: data.MainClassification,
                secondaryClassification: data.SecondaryClassification,
                subClassification: data.SubClassification,
                //composition: data.AssetCompostion.Assets,
                managementFee: data.ManagementFee,
                variableFee: data.VariableFee || 0,
                trusteeFee: data.TrusteeFee
            }

            // Return the fund object
            resolve(fund)

        // Error handling
        }).catch(e => {

            // ETF (not a fund)
            if (e.response.status === 404)
                axios.get(`https://mayaapi.tase.co.il/api/etf/details?fundId=${id}`, { headers: { 'X-Maya-With': true } })

            // Get results
            .then(res => {

                const data = res.data.ETFDetails.FundDetails
                const fund = {
                    type: 'etf',
                    name: data.FundLongName,
                    shortName: data.FundShortName,
                    fundID: data.FundId,
                    //indicators: data.FundIndicators,
                    imitating: data.FundIndicators.find(i => i.Key === 'ImitatingFund').Value,
                    classification: data.MainClassification,
                    secondaryClassification: data.SecondaryClassification,
                    subClassification: data.SubClassification,
                    //composition: data.AssetCompostion.Assets,
                    managementFee: data.ManagementFee,
                    variableFee: data.VariableFee || 0,
                    trusteeFee: data.TrusteeFee
                }

                // Return the ETF object
                resolve(fund)

            // Error handling
            }).catch(e => console.log(e))
        })
    })
}

const main = async () => {
    const ids = await getFundIds()
    await parseFunds(ids).then(() => process.exit())
}

main()