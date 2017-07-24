/**
 * <summary>
 *  importing a libraries. using require. additional libraries need to be included in command prompt (kudu) 
 * </summary>
 */
var fetch = require('node-fetch-npm');
var https = require('https')

/**
 * <summary>
 *  global declaration of fb reporting api. these variable will be use to construct full url fb request.
 *  more parameter found below.
 * </summary>
 */
const base = "https://graph.facebook.com/v2.8/566718123532432/app_insights/app_event/?"
const summary = "summary=true&"
const event = "event_name="
const count = "aggregateBy="
const accessToken = "access_token=566718123532432|cUFaJ9Xjo5HOloyMAD1xoBPbwpc"

/**
 * <summary>
 *  additional parameter in aggregate are required in fb request.
 *  add is required to concate two or more parameter
 * </summary>
 */
const add = "&"
const aggregate_count = "COUNT"
const aggregate_sum = "SUM"

/**
 * <summary>
 *  starting and ending date for fb request. this to be used one time only.
 *  calling findSpecificDate() function. 
 * </summary>
 */
const startDate = findSpecificDate("2017-02-1")
const endDate = findSpecificDate("2017-07-21")

/**
 * <summary>
 *  function to find yesterday date. because fb query is lagging behind local time,
 *  findDate will need to be minus (-1) day to account for gmt difference.
 * </summary>
 * 
 * <param name = empty></param>
 * <return> date </return>
 */
function findDate() {
    // create date object and pass to variable
     var d = new Date();

     // set the date by getting current date and minus one (-1)
     d.setDate(d.getDate()-1);

     // return date 
     // devide by 1000 (timestamp in js is in ms whereas UNIX is in second)
     return Math.floor( d / 1000);    
}

/**
 * <summary>
 *  find specific date based on second. dateSpecific is date datatype.
 * </summary>
 * 
 * <param name = date dateSpecific></param>
 * <return> specific date in second </return>
 */
function findSpecificDate(dateSpecific) {
     // Accept specific date and create a new object based on the date
     var d = new Date(dateSpecific);

     // get the date and assign to a variable d.
     d.setDate(d.getDate());
     
     // return the date in UNIX second
     return Math.floor( d / 1000);    
}

/**
 * construct parameter for date function. fb take starting and ending date. 
 * this function construct the param necessary for api call. 
 * dont delete commented line as it can be used for specific date.
 */

// const since = "since=" + startDate + add;
// const until = "until=" + endDate + add;
var since = "since=" + findDate() + add;
var until = "until=" + findDate() + add;

/**
 * constant object of network type that will be using in fb url request.
 * these object are used for make_url function to construct url.
 */
const ads = {
  adsNetReqCount: "fb_ad_network_request",
  adsNetReqSum: "fb_ad_network_request",
  adsNetImp: "fb_ad_network_imp",
  adsClick: "fb_ad_network_click",
  adsRevenue: "fb_ad_network_revenue",
  adsVideo: "fb_ad_network_video_view",
  
};

/**
 * main function start. module type function.
 */
// context and myTimer is provided by azure function.
module.exports = function (context, myTimer) {
    // create array containing url.  
    const url_array = [];

    // log for debugging purposes.
    context.log(since);
    context.log(until);

    // check whether azure is late to run. log it for debugging purposes.
    if(myTimer.isPastDue)
    {
        context.log('JavaScript is running late!');
    }

    /**
     * <summary>
     *  function to construct full url and added it to object
     * </summary>
     * 
     * <param name = empty></param>
     * <return> url array of objects </return>  
     */
    make_url();

    /**
     * <summary>
     *  using promises to fetch data in json file format. loop using map for each url.
     * </summary>
     * 
     * <param name = url_array[]> array of url for fetch </param>
     * <param name = .map()> using map to loop through all array of url </param>
     * <param name = fetch(url)> fetch each url to return the data </param>
     * <param name = .json()> convert data in json file format </param>
     */
    var promises = url_array.map((url) => fetch(url.url).then((y) => y.json()))

    /**
     * <summary>
     *  using promises function, each promise must be resolved. A resolved promises return data. 
     *  these data are then added to object and each object added to an array.
     *  then, these array are passed to the queue storage.
     * </summary>
     * 
     * <param name = Promises> resolved promises to obtains data </param>
     * <param name = .all()> resolved through a collection of promises </param>
     * <param name = results> result of the fetch data </param>
     */
    Promise.all(promises).then(results => {
        // create array of value object
        let value = []
        
        // create array of myQueItem object
        context.bindings.myQueueItem = [];

        // loop through all the array of results fetch from promises
        for(var i=0; i < results.length; i++){

            // add the result obtain into value array.
            value.push( results[i].data )

            // add each url and its value in an object form
            var toBeQue = {
                types: url_array[i],
                data: value[i],
            }

            // put the object toBeQue to myQueItem
            context.bindings.myQueueItem.push(toBeQue);
        }
        // create a timeout so that the function give time for the data to processed.
        // context.done() to close the connection to storage queue.
        setTimeout(() => context.done(), 3000)
        
    });

    /**
     * <summary>
     *  function to construct url using the parameter declared on top. 
     *  return the full url and added to an array
     * </summary>
     * 
     * <param name = empty></param>
     */
    function make_url(){
        // using object keys to get the key of an object rather than its value
        // using foreach to loop through all the value of the object
        Object.keys(ads).forEach((prop) => {
            
            // only adsRevenue and adsNetReqSum are required to have aggregate in SUM.
            // so, a checking is required for both these condition
            if(prop === "adsRevenue" || prop === "adsNetReqSum") {

                // construct url based on parameter declared on top
                var url1 = base + since + until + event +
                        ads[prop] + 
                        add + count +
                        aggregate_sum + add +
                        accessToken;
                
                // create an object. add the newly created url to the object
                var url_req1 = {
                    type: prop,
                    url: url1
                }

                // put all the object created with url to an array
                url_array.push(url_req1)

            } 
            // other than adsRevenue and adsNetReqSum, all run the same with aggregate COUNT
            else {

                // construct url
                var url2 = base + since + until + event +
                        ads[prop] + 
                        add + count +
                        aggregate_count + add +
                        accessToken;
                
                // create object and put all the data using this structure
                var url_req2 = {
                    type: prop,
                    url: url2
                }

                // push the object to an array
                url_array.push(url_req2)
                        
            }                     
        });
    }
};

