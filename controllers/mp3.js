const router = require("express").Router();
const db = require("../models");
const axios = require("axios").default;
const YoutubeMusicApi = require("youtube-music-api");
const musicApi = new YoutubeMusicApi();
const { createLrc } = require("./lrc.js");
const fs = require("fs");
const path = require("path");

router.post("/api/download", (req, res) => {
  musicApi
    .initalize() // Retrieves Innertube Config
    .then(() => {
      if (!req.body.name) {
        res.json({ err: "Please enter a valid input." });
      } else {
        musicApi.search(req.body.name, "song").then((songResult) => {

          console.log(19, songResult.content[0])

          const songName = songResult.content[0].name.toLowerCase();
          const artistName = songResult.content[0].artist.name.toLowerCase();

          fs.readdir(path.join(__dirname, "../lrc"), (err, data) => {

            if (data.indexOf(`${songName} - ${artistName}.lrc`) === -1) {
              console.log(27, songName)
              console.log(28, artistName)

              // bug: user search "let it go original"
              // musicApi response for song name  - 'Let It Go (From "Frozen"/Soundtrack Version)'
              // the '/' causes an issue for createLrc() filepath
              // split on the unwanted characters and join with single space to remove unwanted characters
              let test = songName
              test = test.split('/').join(' ')
              console.log(36, test)


              createLrc(test, artistName);

              const options = {
                method: "GET",
                url: "https://youtube-to-mp32.p.rapidapi.com/yt_to_mp3",
                params: { video_id: songResult.content[0].videoId },
                headers: {
                  "x-rapidapi-key":
                    "5d41389558mshc739796a61beb69p102c43jsn1612f6aaee40",
                  "x-rapidapi-host": "youtube-to-mp32.p.rapidapi.com",
                },
              };

              axios
                .request(options)
                .then(function (response) {
                  console.log(55, response.data)// see below
                  // 55 {
                  //   Status: 'Fail',
                  //   Status_Code: 103,
                  //   Warining: 'Video Id Maybe Invalid Or Retry Again May Work'
                  // }
                  const mp3Url = response.data.Download_url;
                  // added-sjf conditional to check if mp3Url exists to avoid db.Song.create failure.
                  if (mp3Url) {
                    db.Song.create({
                      name: songName,
                      artist: artistName,
                      lyrics: `${songName} - ${artistName}.lrc`,

                      mixed: mp3Url,
                    }).then(() => {
                      res.send("downloaded");
                    })
                      // added-sjf
                      .catch(err => {
                        console.log(67)
                        res.status(500).send(err)
                      })
                  } else {
                    res.status(404).send(response.data) // see example on line 55
                  }
                })
                .catch(function (error) {
                  console.error(error)
                  // added-sjf
                  res.status(500).send(err)
                });
            } else {
              res.send("this song already existed!");
            }
          });
        });
      }
    })
    // added-sjf
    .catch(err => {
      console.log(84)
      res.status(500).send(err)
    })
});

module.exports = router;
