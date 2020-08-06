const express = require('express');
const request = require('request');
const app = express();
const redis = require("redis");
const client = redis.createClient();
const port = 3333;
const apiKey = 'c372a793a410013be710d10a3d215490';
const tvId = 3;
client.on("error", function(redisError) {
    console.error("redis connection error :", redisError);
});

app.get('/topEpisodes/:seasonId', async (req: any, res: any) => {
    let seasonId: number = req.params.seasonId;
    let key: string = "season-" + seasonId;
    let cacheResp: any;
    let resp: any = {};
    //to get data from cache
    await client.get(key, function(err, data) {
        cacheResp = data;
    })

    if (cacheResp) {
        resp['episodes'] = JSON.parse(cacheResp);
        //assuming API data is not changing so no further checking from API if data found in cache
        res.send(resp);
        return;
    }
    
    let apiUrl = 'https://api.themoviedb.org/3/tv/' + tvId + '/season/' + seasonId + '?api_key=' + apiKey;
    await request(apiUrl, function(error, response, body) {
        if (error) {
            console.log('error :' + error);
            res.json({});
            return;
        }
        let apiResp = JSON.parse(body);
        // handled response, if API return error code
        if (apiResp && (apiResp.status_code == 7 || apiResp.status_code == 34)) {
            console.log('error :' + apiResp.status_code);
            res.json({});
            return;
        } else {
            let result = apiResp.episodes.map(({ name, vote_average }) => ({ name, vote_average }));
            let sortedArr = result.sort(compareVote);
            sortedArr = sortedArr.slice(0, 20);
            client.set(key, JSON.stringify(sortedArr));
            resp['episodes'] = sortedArr;
            res.send(resp);
            return;
        }
    });
});

app.get('/analytics/popularSeries/:groupId', async (req: any, res: any) => {
    let groupId: number = req.params.groupId;
    let key: string = "popular-series-" + groupId;
    let cacheResp: any;
    let resp: any = {};
    //to get data from cache
    await client.get(key, function(err, data) {
        cacheResp = data;
    });

    if (cacheResp) {
        resp['episodes'] = JSON.parse(cacheResp);
        //assuming API data is not changing so no further checking from API if data found in cache
        res.send(resp);
        return;
    }

    let apiUrl = 'https://api.themoviedb.org/3/tv/episode_group/' + groupId + '?api_key=' + apiKey + '&language=en-US';
    await request(apiUrl, function(error, response, body) {
        if (error) {
            console.log('error :' + error);
            res.json({});
            return;
        }
        let apiResp = JSON.parse(body);
        // handled response, if API return error code
        if (apiResp && (apiResp.status_code == 7 || apiResp.status_code == 34)) {
            console.log('error :' + apiResp.status_code);
            res.json({});
            return;
        } else {
            let result = apiResp.map(({ name, episode_count }) => ({ name, episode_count }));
            let sortedArr = result.sort(compareEpisode);
            sortedArr = sortedArr.slice(0, 5);
            client.set(key, sortedArr);
            res.send(sortedArr);
            return;
        }
    });
});

/* function to compare average vote */
function compareVote(a, b) {
    const voteA = a.vote_average;
    const voteB = b.vote_average;
  
    let comparison = 0;
    if (voteA > voteB) {
      comparison = 1;
    } else if (voteA < voteB) {
      comparison = -1;
    }
    return comparison;
}

/* function to compare episode count*/
function compareEpisode(a, b) {
    const episodeA = a.episode_count;
    const episodeB = b.episode_count;
  
    let comparison = 0;
    if (episodeA > episodeB) {
      comparison = 1;
    } else if (episodeA < episodeB) {
      comparison = -1;
    }
    return comparison;
}

app.listen(port, err => {
  if (err) {
    return console.error(err);
  }
  return console.log(`server is listening on ${port}`);
});