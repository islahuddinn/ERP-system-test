function calculateERP(order) {
     
    if(!order || typeof order !== 'object') {
        return { error: "no valid order provided"
        };
    }
    const rates = order.exchangeRates || { USD: 1, IQD: 0.0076 };
     
    if (!rates.IQD) {
        return {
            error: "missing IQD rate"
        }
    }

    /// getting items (assuming order.items is an array of price,currency, quantity)

    const items = order.items || [];
    if (items.length < 2 ) {
        return {
            error: "missing items"
        }
    };

    const item1 = items[0];
    const item2 = items[1];

    /// converting prices as per the exchange rate
   const toUSD = (price, currency) => {
    const rate = rates[currency]; 
    if(!rate) throw new Error(`missing rate for the ${currency}`);
    return price * rate;
   };

   let price1USD = toUSD(item1.price, item1.currency);
   let price2USD = toUSD(item2.price, item2.currency);

   //// now setting per item discounts (flags from order default false)

   const paidInUSD = order.paidInUSD === true;

   const paidWithin3Days = order.paidWithin3Days === true;

   let discount1 = 0;
   if(paidInUSD) discount1 = price1USD * 0.05;
   let discount2 = 0;
   if(paidWithin3Days) discount2 = price2USD * 0.10; 

   const price1AfterDiscount = price1USD - discount1;
   const price2AfterDiscount = price2USD - discount2;

   //////sub total before global discount

   const subtotal = price1AfterDiscount + price2AfterDiscount;

   ///// global discount

   let globalDiscountPercent = subtotal > 150 ? 0.08 : 0.03;

   const globalDiscount = subtotal * globalDiscountPercent;
   const afterGlobalDiscount = subtotal - globalDiscount;

   ///// 12% tax on amount after global discount

   const tax = afterGlobalDiscount * 0.12;
   const afterTax = afterGlobalDiscount + tax;

   ///// surchage

   let surcharge = 0; 
   if (afterTax > 200) surcharge = afterTax * 0.02;

   const totalDueBeforePayments = afterTax + surcharge;

   ////// payments processing in an order first USD, then IQLD with IQD fee

   const payments = order.payments || [];

   let paymentsTotalUSD = 0;
    for (let p of payments) {
        if (p.currency === 'USD') {
            paymentsTotalUSD += p.amount;
        } else if ( p.currency === 'IQD'){

            ////// Adding 1% fee on the IQD amount before conversion
            const feeIQD = p.amount * 0.01; 
            const totalIQD = p.amount + feeIQD;
            paymentsTotalUSD += totalIQD * rates.IQD
        } else {
            return {error:`missing rate for ${p.currency}`};
        }
    }

    //// round off logic ussing Math.round

    const round2 = (num) => Math.round(num * 100) / 100;

    const finalDue = round2(Math.max(0, totalDueBeforePayments - paymentsTotalUSD));
    const overpayment = round2(Math.max(0, paymentsTotalUSD - totalDueBeforePayments));

    //// perpearing the outputs

    const results = [
        round2(price1USD), 
        round2(price2USD), 
        round2(price1USD + price2USD), 
        round2(discount1), 
        round2(discount2),
        round2(globalDiscount),
        round2(tax),
        round2(surcharge),
        round2(paymentsTotalUSD),
        finalDue
    ];
    return {
        results, 
        due: finalDue,
        overpayment,
        totalDueBeforePayments: round2(totalDueBeforePayments)
    };
}

const orderExamples = {
    items: [
        {price: 100, currency: 'USD', quantity: 1},
        {price:100000, currency: "IQD", quantity:1}
    ],
    payments: [
        {amount: 60, currency: "USD"},
        {amount: 20, currency: "IQD"}
    ],
    exchangeRates: {
        USD:1, IQD: 0.00076
    },
};

const output = calculateERP(orderExamples);

console.log (output.results)