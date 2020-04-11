const puppeteer = require('puppeteer')
const fs = require('fs')
const axios = require('axios')
const fundIds = require('./ids.json')
const fundObjects = require('./funds.json')

// Important tags
/*
"PurchasePrice": 127.53,
"SellPrice": 127.53,
"CreationPrice": 127.53,
"UnitValuePrice": 127.53,
"UnitValueValidDate": "2020-04-07T00:00:00",
"DayYield": 0.03,
"ShowDayYield": true,
"DailyRemark": null,
"PosNegYield": 1,
"CorrectTradeDate": "2020-04-07T00:00:00",
"IsKosherFund": false,
"MachamTotal": "3.255",
"DisclosureDateOfReport": "2020-03-31T00:00:00",
"StockType": 1,
"FundType": 2,
"RegisteredCapitalPaid": null,
"PersonalFolderLink": null,
"MonthShowYield": true,
"MonthYield": 0.82,
"MonthPosNeg": 1,
"MonthAverage": 0.825,
"MonthDesc": "תשואה מתחילת החודש ב-%",
"MonthRemark": null,
"YearShowYield": true,
"YearYield": -2.99,
"YearPosNeg": -1,
"YearAverage": -2.93,
"YearDesc": "תשואה מתחילת השנה ב-%",
"YearRemark": null,
"Last12MonthShowYield": true,
"Last12MonthYield": -2.85,
"Last12MonthPosNeg": -1,
"Last12MonthAverage": -2.796666,
"Last12MonthDesc": "תשואה 12 חודשים ב-%",
"Last12MonthRemark": null,
*/

// Sleep for a certain number of seconds
const sleep = (seconds) => {
    return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000)
    })
}

// Get the paper ids from tase
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
    
        // Write IDs to a JSON file
        fs.writeFile('ids.json', JSON.stringify(ids), e => {
            if (e) throw e
            else resolve()
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

// Go through all funds and parse them
const parseFunds = async () => {

    const funds = []
    for (let id of fundIds){

        // Get the fund object
        const fund = await getFundInfo(id)
        if (fund) funds.push(fund)
        else continue
    }

    // Process finished, write to a JSON file
    fs.writeFile('funds.json', JSON.stringify(funds), e => {
        if (e) console.log(e)
        else console.log('done')
    })
}

// Sort the funds by ascending fees, then write as a JSON file
const sortFunds = () => {
    
    // Sort by fees
    fundObjects.sort((a, b) => {
        const feeA = a.managementFee + a.trusteeFee + a.variableFee
        const feeB = b.managementFee + b.trusteeFee + b.variableFee

        if (feeA > feeB) return 1
        else if (feeA < feeB) return -1
        else return 0
    })

    // Write to file
    fs.writeFile('sortedFunds.json', JSON.stringify(fundObjects), e => {
        if (e) console.log(e)
        else console.log('done')
    })
}

sortFunds()
//parseFunds()