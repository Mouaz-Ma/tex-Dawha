const passport = require('passport');

const express = require('express'),
      router  = express.Router(),
      User = require('../models/users');
      
const { isLoggedIn } = require('../middleware');

/* GET home page. */
router.get('/',function(req, res, next) {
    res.render('index', { title: 'k3ki' });
  });

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async(req, res) => {
    try{
        if(req.body.adminCode != ""){
            const { email, username, password } = req.body;
            const user = new User ({email, username});
            if(req.body.adminCode === process.env.ADMIN_SECRERT){
                user.isAdmin = true;
            await User.register(user, password);
            req.flash('success', 'Succesfully made a new Admin User');
            res.redirect('/');
            console.log("admin registered")
        } else {
            req.flash('error', 'Wrong Admin Code');
            res.redirect('/register');
            console.log("admin register error")
        }
        } else {
            const { email, username, password } = req.body;
            const user = new User ({email, username});
            await User.register(user, password);
            req.flash('success', 'Succesfully made a new user for university');
            res.redirect('/register');
            console.log("university registered")
        }
    }
    catch(e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
});

router.get('/login', (req, res) => {
    res.render('login');
})

router.post('/login', passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), (req, res) => {
    req.flash('success', 'welcome!');
    res.redirect('/');
})

// LOGOUT ROUTE
router.get('/logout', function(req, res) {
    req.logout();
    req.flash("success", "Logged out!");
    res.redirect('/');
  });


module.exports = router;