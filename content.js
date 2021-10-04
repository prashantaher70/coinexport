function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (!sender.tab) {
            if (request.action === "COIN_NAV_EXPORT") {
                parseAndDownloadNavs(request.ext).then(() => console.log('exported')).catch(e => console.log(e))
            }
        }
    }
);


const headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-GB,en;q=0.9",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
}
const referrer = "https://coin.zerodha.com/dashboard"

async function getDashboard(token) {
    let response = await fetch("https://coin.zerodha.com/api/dashboard_details?session_token=" + token, {
        "headers": headers,
        "referrer": referrer,
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    })
    if (response.status == 200) {
        return response.json()
    }
    throw [1, "Unknown http error occurred. Status: " + response.status]
}

async function parseAndDownloadNavs(ext) {
    let token = getCookie("session_token")
    if (!token) {
        throw [0, "Please login to Coin first"]
    }
    let dashboard = await getDashboard(token)

    let funds = []

    for (let i = 0; i < dashboard.data.portfolio.length; i++) {
        let fund = dashboard.data.portfolio[i]

        let mfund = {}
        mfund.amount = fund.amount
        mfund.bse_scheme_code = fund.bse_scheme_code
        mfund.bse_scheme_code_slug = fund.bse_scheme_code_slug
        mfund.isin = fund.isin
        mfund.nav = fund.nav
        mfund.nav_date = fund.nav_date
        mfund.plan = fund.plan
        mfund.name = fund.scheme_name
        mfund.units = fund.units
        funds.push(mfund)

        let navs = []
        mfund.navs = navs
        
        for (let j = 0; j < fund.order_history.length; j++) {
            let order = fund.order_history[j]
            navs.push(
                {
                    status: order.status,
                    allotment_date: order.allotment_date,
                    amount: order.amount,
                    folio_number: order.folio_number,
                    nav: order.nav,
                    order_id: order.order_id,
                    order_type: order.order_type,
                    ordered_at: order.ordered_at,
                    settlement_number: order.settlement_number,
                    transaction_amount: order.transaction_amount,
                    units: order.units
                }
            )
        }
    }

    function save(j) {
        download('coin-export-' + new Date().getTime() + "." + ext, j)
    }

    if (ext === "json") {
        save(JSON.stringify(funds))
    } else if (ext === "csv") {
        save(csvify(funds))
    }
};

function csvify(funds) {
    let csv = "ISIN,Name,BSE Scheme Code,BSE Scheme Code Slug,"
                + "Plan,Folio Number,Status,Allotment Date,Amount,Order ID,Order Type,"
                + "Ordered At,Settlement Number,NAV,Transaction Amount,Units"
                + "\n"

    for (let i = 0; i < funds.length; i++) {
        let fund = funds[i]
        for (let j = 0; j < fund.navs.length; j++) {
            let nav = fund.navs[j]
            csv = csv 
                    + fund.isin + "," + fund.name + "," 
                    + fund.bse_scheme_code + "," + fund.bse_scheme_code_slug + ","
                    + fund.plan + ","
                    + nav.folio_number + ","
                    + nav.status + "," + nav.allotment_date + ","
                    + nav.amount + "," 
                    + nav.order_id + "," + nav.order_type + "," + nav.ordered_at + "," + nav.settlement_number + ","
                    + nav.nav + "," + nav.transaction_amount + "," + nav.units
                    + "\n"
        }
    }
    return csv
}