if (process.env.NODE_ENV !== "production") {
  require('dotenv').config({
    path: __dirname + '/.env'
  });
}
require('dotenv').config()
const express = require('express'),
  router = express.Router(),
  qr = require("qrcode"),
  fs = require('fs'),
  User = require('../models/users'),
  Degree = require('../models/degree'),
  Visitor = require('../models/visitor'),
  {
    isLoggedIn
  } = require('../middleware'),
  nodeMailer = require('nodemailer'),
  excel = require('exceljs'),
  moment = require('moment');

// canvas setup
const {
  createCanvas,
  loadImage
} = require('canvas')


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'k3ki'
  });
});

router.get('/tex', (req, res) => {
  res.redirect('/');
})

// POST request listener to convert the user id to qr code and mail it to the user

router.post("/scan", async (req, res) => {
  const pass = process.env.MAIL_PASSWORD;
  const newVisitor = new Visitor(req.body);
  console.log(req.body);
  await newVisitor.save();

  const url = "http://doha.marifetedu.com/visitor/" + newVisitor._id.toString();

  // If the input is null return "Empty Data" error
  if (newVisitor.length === 0) res.send("Empty Data!");

  // const us convert the input stored in the url and return it as a representation of the QR Code image contained in the Data URI(Uniform Resource Identifier)
  // It shall be returned as a png image format
  // In case of an error, it will save the error inside the "err" variable and display it

  //checking if there is an email
  if (req.body.email == '') {
    qr.toDataURL(url, (err, src) => {
      if (err) res.send("Error occured")

      res.set('src', src);
      res.render("visitor", {
        src
      });
    })
  } else {
    qr.toDataURL(url, (err, src) => {
      if (err) res.send("Error occured")

      res.set('src', src);

      res.render("visitor", {
        src
      });

      const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, //use ssl
        auth: {
          user: 'tex@marifetedu.com',
          pass: pass
        }
      });
      const mailOptions = {
        from: 'info@marifetedu.com', // sender address
        to: req.body.email, // list of receivers
        subject: 'بطاقة معرض TEX', // Subject line
        text: 'Marifet', // plain text body
        html: '<h1> شكرا </h1> <p> لقد تم حجز مقعد لك في المعرض يرجى الاحتفاظ بالرمز من خلال صورة أو على بريدك الالكتروني</p> <br> <img src="' + src + '"> <br> <a href="' + url + '">اضغط هنا لمشاهدت معلوماتك</a> ', // html body
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);

        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      });
    });
  }
});

// ============
// this route handles the event when the URL of a Visitor was hit
// ============

router.get('/visitor/:id', async (req, res) => {
  if (String(req.params.id).match(/^[0-9a-fA-F]{24}$/)) {
    // Yes, it's a valid ObjectId, proceed with `findById` call.
    if (!req.isAuthenticated()) {
      //if you are not logged in as a university show the qr code and simple message
      const {
        id
      } = req.params;
      const foundVisitor = await Visitor.findById(id);
      if(!foundVisitor){
        req.flash('error', "the Studen Id isnt a valid ID");
        res.redirect('/');
      } else {
        // const time = moment(foundVisitor.dateOfBirth);
        // const dob = time.format("DD/MM/YYYY");
        const qrurl = "http://doha.marifetedu.com/visitor/" + id.toString();
        qr.toDataURL(qrurl, (err, src) => {
          if (err) res.send("Error occured")
          res.render('visitor', {
            foundVisitor,
            src
          });
        })
      }
    } else {
      //check if he is admin send him to admin info page where he can add the info for a student and print the image
      if (req.user.isAdmin == true) {
        const {
          id
        } = req.params;
        const foundVisitor = await Visitor.findById(id);
        if(!foundVisitor){
          req.flash('error', "the Studen Id isnt a valid ID");
          res.redirect('/');
        } else {
          // const time = moment(foundVisitor.dateOfBirth);
          // const dob = time.format("DD/MM/YYYY");
          const qrurl = "http://doha.marifetedu.com/visitor/" + id.toString();
          qr.toDataURL(qrurl, (err, src) => {
            if (err) res.send("Error occured")
            res.render('adminInfo', {
              foundVisitor,
              src
            });
          })
        }
        } else {
          //check which university saw this student and record that to the database and render the info so the uni can register the degree
          const {
            id
          } = req.params;
          const foundVisitor = await Visitor.findById(id);
          // const time = moment(foundVisitor.dateOfBirth);
          // const dob = time.format("DD/MM/YYYY");
        
          if(!foundVisitor){
            req.flash('error', "the Studen Id isnt a valid ID");
            res.redirect('/');
          } else {
            if (foundVisitor.seenBy == req.user.username){
              const qrurl = "http://doha.marifetedu.com/visitor/" + id.toString();
            qr.toDataURL(qrurl, (err, src) => {
              if (err) res.send("Error occured")
              res.render('info', {
                foundVisitor,
                src
              });
            })
           } else {
              const newVisitor = new Visitor();
              newVisitor.Name = foundVisitor.Name;
              newVisitor.telephonNumber = foundVisitor.telephonNumber;
              newVisitor.email = foundVisitor.email;
              newVisitor.seenBy = req.user.username;
              newVisitor.attended = true;
              newVisitor.save();
              foundVisitor.seenBy = req.user.username;
              const qrurl = "http://doha.marifetedu.com/visitor/" + id.toString();
              qr.toDataURL(qrurl, (err, src) => {
                if (err) res.send("Error occured")
                res.redirect('/visitor/' + newVisitor._id);
              })
            }
          }
        }
      }
  } else {
    req.flash('error', "the Studen Id isnt a valid ID");
    res.redirect('/');
  }
})


//===============
// update degree routes
//===============

router.post("/user/:id", isLoggedIn, async (req, res) => {
  if (String(req.params.id).match(/^[0-9a-fA-F]{24}$/)) {
  // is it admin?
  if (req.user.isAdmin == true) {
    const newVisitor = new Visitor(req.body);
    newVisitor.seenBy = req.user.username;
    newVisitor.degree = req.body.degree;
    newVisitor.attended = true;
    newVisitor.save();
    req.flash('success', 'The User record has been updated');
    res.redirect('/visitor/' + newVisitor._id);
  } else {
    const {id} = req.params.id;
    const foundVisitor = Visitor.findById(req.params.id, (err, visitor) => {
      if (err) {
        req.flash('error', err.message);
        res.redirect('/');
      } else {
        console.log(visitor);
      const newVisitor = new Visitor();
      newVisitor.Name = visitor.Name;
      newVisitor.telephonNumber = visitor.telephonNumber;
      newVisitor.email = visitor.email;
      newVisitor.seenBy = req.user.username;
      newVisitor.degree = req.body.degree;
      newVisitor.attended = true;
      newVisitor.save();
      req.flash('success', 'The Degree desired has been registered');
      res.redirect('/visitor/' + newVisitor._id);
      }
    })
  }
    }else {
      req.flash('error', "the Studen Id isnt a valid ID");
      res.redirect('/');
    }
})

// ==============
// printing functionality
// ==============

router.get("/user/:id/print", async (req, res) => {
  const {
    id
  } = req.params;
  await Visitor.findById(req.params.id, (err, visitor) => {
    const text = visitor.Name;
    const canvas = createCanvas(700, 400);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '40px serif';
    context.textAlign = 'center';
    context.fillStyle = '#000000';
    context.fillText(text, 380, 180)
    const qrurl = "http://doha.marifetedu.com/visitor/" + id.toString();
    qr.toDataURL(qrurl, (err, src) => {
      if (err) {
        res.send("Error occured")
      } else {
        loadImage(src).then(image => {
          context.drawImage(image, 280, 200);
          const buffer = canvas.toBuffer('image/jpeg');
          fs.writeFileSync('image.jpeg', buffer);
          res.download('image.jpeg');
        })
      }
    })
  })
})

// ==========
// Download Data
// ==========
router.get("/user/download", async (req, res) => {
  const visitors = await Visitor.find({});
  const workbook = new excel.Workbook(); //creating workbook
  const visitorsWorksheet = workbook.addWorksheet('Visitors'); //creating worksheet
  visitorsWorksheet.columns = [{
      header: 'Record Id',
      key: '_id',
      width: 30
    },
    {
      header: 'name',
      key: 'Name',
      width: 30
    },
    {
      header: 'telephonNumber',
      key: 'telephonNumber',
      width: 30
    },
    {
      header: 'attended',
      key: 'attended',
      width: 30
    },
    {
      header: 'degree',
      key: 'degree',
      width: 30
    },
    {
      header: 'Seen By',
      key: 'seenBy',
      width: 30
    },
    {
      header: 'Heard about us by',
      key: 'heardBy',
      width: 30
    },
    {
      header: 'email',
      key: 'email',
      width: 30
    },
  ];
  // adding rows
  visitorsWorksheet.addRows(visitors);
  // Write to File
  workbook.xlsx.writeFile("visitors.xlsx")
    .then(function () {
      console.log("file saved!");
      res.download('visitors.xlsx');
    });
});


// ==========
// search
// ==========

router.get('/search', async function(req, res, next){
  const q = req.query.q;
  const visitorsFound = await Visitor.find({Name: {$regex: new RegExp(q), $options: 'i'}})
  console.log(visitorsFound)
  res.json(visitorsFound)
})

router.get('/searchNumber', async function(req, res, next){
  const q = req.query.q;
  const visitorsFound = await Visitor.find({telephonNumber: {$regex: new RegExp(q), $options: 'i'}})
  console.log(visitorsFound)
  res.json(visitorsFound)
})

module.exports = router;