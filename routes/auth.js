var express = require("express");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var crypto = require("crypto");
var db = require("../db");
var GoogleStrategy = require("passport-google-oauth20").Strategy;
var KakaoStrategy = require("passport-kakao").Strategy;
var JwtStrategy = require("passport-jwt").Strategy;
var ExtractJwt = require("passport-jwt").ExtractJwt;
var jwt = require("jsonwebtoken");

/* Configure password authentication strategy.
 *
 * The `LocalStrategy` authenticates users by verifying a username and password.
 * The strategy parses the username and password from the request and calls the
 * `verify` function.
 *
 * The `verify` function queries the database for the user record and verifies
 * the password by hashing the password supplied by the user and comparing it to
 * the hashed password stored in the database.  If the comparison succeeds, the
 * user is authenticated; otherwise, not.
 */
passport.use(
  new LocalStrategy(function verify(username, password, cb) {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      function (err, row) {
        if (err) {
          return cb(err);
        }
        if (!row) {
          return cb(null, false, {
            message: "Incorrect username or password.",
          });
        }

        const token = jwt.sign({}, "secretKey", {
          expiresIn: "3h",
          issuer: "http://lol-api.ggq.gg/auth",
          subject: "subject-test",
          jwtid: "jwtId-test",
        });
        console.log(`token:`, token);

        crypto.pbkdf2(
          password,
          row.salt,
          310000,
          32,
          "sha256",
          function (err, hashedPassword) {
            if (err) {
              return cb(err);
            }
            if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
              return cb(null, false, {
                message: "Incorrect username or password.",
              });
            }
            return cb(null, row);
          }
        );
      }
    );
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "61660663640-3mtk3ple6f9dv2tuohq7fj5imm6vfs00.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "http://localhost:3000/oauth/google",
      scope: ["profile"],
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("accessToken:", accessToken);
      console.log("refreshToken:", refreshToken);
      console.log(profile);
      const user = {
        provider: "google",
        id: profile.id,
        username: profile.displayName,
      };
      return done(null, user);
    }
  )
);

passport.use(
  new KakaoStrategy(
    {
      clientID: "c56eab53aa9812c1efe939e48b8d12db",
      clientSecret: "PtePjA35ad8zeJ3hZPCtWcVFZqou4LSx",
      callbackURL: "http://localhost:3000/oauth/kakao",
    },
    (accessToken, refreshToken, profile, done) => {
      console.log("accessToken:", accessToken);
      console.log("refreshToken:", refreshToken);
      console.log(profile);
      const user = {
        provider: "kakao",
        id: profile.id,
        username: "kminkang@naver.com",
      };
      return done(null, user);
    }
  )
);

passport.use(
  new JwtStrategy(
    {
      issuer: "http://lol-api.ggq.gg/auth",
      secretOrKey: "secretKey",
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    },
    (payload, done) => {
      console.log(`payload: `, payload);
      const user = {
        id: payload.sub,
        username: "kminkang (token)",
      };
      return done(null, user);
    }
  )
);

/* Configure session management.
 *
 * When a login session is established, information about the user will be
 * stored in the session.  This information is supplied by the `serializeUser`
 * function, which is yielding the user ID and username.
 *
 * As the user interacts with the app, subsequent requests will be authenticated
 * by verifying the session.  The same user information that was serialized at
 * session establishment will be restored when the session is authenticated by
 * the `deserializeUser` function.
 *
 * Since every request to the app needs the user ID and username, in order to
 * fetch todo records and render the user element in the navigation bar, that
 * information is stored in the session.
 */
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    console.log(`serializeUser: `, user);
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    console.log(`deserializeUser: `, user);
    return cb(null, user);
  });
});

var router = express.Router();

/* GET /login
 *
 * This route prompts the user to log in.
 *
 * The 'login' view renders an HTML form, into which the user enters their
 * username and password.  When the user submits the form, a request will be
 * sent to the `POST /login/password` route.
 */
router.get("/login", function (req, res, next) {
  res.render("login");
});

router.get("/login/google", passport.authenticate("google"));

router.get(
  "/oauth/google",
  passport.authenticate("google", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

router.get("/login/kakao", passport.authenticate("kakao"));

router.get(
  "/oauth/kakao",
  passport.authenticate("kakao", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

router.get(
  "/login/jwt",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log(req.user.profile);
    console.log("login/jwt success");
    res.send(req.user.profile);
  }
);

/* POST /login/password
 *
 * This route authenticates the user by verifying a username and password.
 *
 * A username and password are submitted to this route via an HTML form, which
 * was rendered by the `GET /login` route.  The username and password is
 * authenticated using the `local` strategy.  The strategy will parse the
 * username and password from the request and call the `verify` function.
 *
 * Upon successful authentication, a login session will be established.  As the
 * user interacts with the app, by clicking links and submitting forms, the
 * subsequent requests will be authenticated by verifying the session.
 *
 * When authentication fails, the user will be re-prompted to login and shown
 * a message informing them of what went wrong.
 */
router.post(
  "/login/password",
  passport.authenticate("local", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
    failureMessage: true,
  })
);

/* POST /logout
 *
 * This route logs the user out.
 */
router.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/* GET /signup
 *
 * This route prompts the user to sign up.
 *
 * The 'signup' view renders an HTML form, into which the user enters their
 * desired username and password.  When the user submits the form, a request
 * will be sent to the `POST /signup` route.
 */
router.get("/signup", function (req, res, next) {
  res.render("signup");
});

/* POST /signup
 *
 * This route creates a new user account.
 *
 * A desired username and password are submitted to this route via an HTML form,
 * which was rendered by the `GET /signup` route.  The password is hashed and
 * then a new user record is inserted into the database.  If the record is
 * successfully created, the user is logged in.
 */
router.post("/signup", function (req, res, next) {
  var salt = crypto.randomBytes(16);
  crypto.pbkdf2(
    req.body.password,
    salt,
    310000,
    32,
    "sha256",
    function (err, hashedPassword) {
      if (err) {
        return next(err);
      }
      db.run(
        "INSERT INTO users (username, hashed_password, salt) VALUES (?, ?, ?)",
        [req.body.username, hashedPassword, salt],
        function (err) {
          if (err) {
            return next(err);
          }
          var user = {
            id: this.lastID,
            username: req.body.username,
          };
          req.login(user, function (err) {
            if (err) {
              return next(err);
            }
            res.redirect("/");
          });
        }
      );
    }
  );
});

module.exports = router;
