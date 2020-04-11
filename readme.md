## Bye-Maya!

##### Maya is the Tel-Aviv Stock-Exchange database center. Their API lacks documentation and is not user-friendly. This application uses node and puppeteer to scrape the financial data from their website and API.

------------
#### Instructions:

1. Run `npm install`

2. Run `node server`

### What is happening behind the scenes
- getFundIds() will scrape the TASE website, get a list of ids, for all of the available trust-funds and ETFs, it returns a list of IDs.

- getFundInfo() takes the fund id as the parameter, then will send a GET request to TASE and receive information about the fund, it will generate a fund object, and return it.

- parseFunds() will takes an id array as a parameter, and it will run getFundInfo() on each id, and then use fs to write the results to a JSON file, containing the result.

#### An example of the results
![(https://i.imgur.com/7SuoHIA.png)](https://i.imgur.com/7SuoHIA.png)