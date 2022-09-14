var express = require("express");
var ensureLogIn = require("connect-ensure-login").ensureLoggedIn;
var db = require("../db");
var axios = require("axios");

const instance = axios.create({
  headers: {
    "Access-Control-Allow-Origin": "http://localhost:3000", // 서버 domain
  },
  withCredentials: true,
});

axios.defaults.withCredentials = true;

var ensureLoggedIn = ensureLogIn();

function fetchTodos(req, res, next) {
  db.all(
    "SELECT * FROM todos WHERE owner_id = ?",
    [req.user.id],
    function (err, rows) {
      if (err) {
        return next(err);
      }

      var todos = rows.map(function (row) {
        return {
          id: row.id,
          title: row.title,
          completed: row.completed == 1 ? true : false,
          url: "/" + row.id,
        };
      });
      res.locals.todos = todos;
      res.locals.activeCount = todos.filter(function (todo) {
        return !todo.completed;
      }).length;
      res.locals.completedCount = todos.length - res.locals.activeCount;
      next();
    }
  );
}

var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  console.log("Render /");
  console.log(`Request to get user`);
  console.log(req.app.locals.user);
  console.log(req.session);
  axios
    .get(`http://localhost:3000/auth/v1/users/${req.app.locals.user.id}`, {
      withCredentials: true,
    })
    .then((response) => {
      console.log(`Get User Info success headers: `, response.headers);
      console.log(`Get User Info success: `, response.data);
      const user = response.data;
      // res.redirect("/index", { user: user });
      res.send("로그인 성공");
    })
    .catch((err) => {
      console.log(`Get User Info error headers: `, err.response.headers);
      console.log(`Get User Info error: `, err.response.data);
      // req.flash("messages", err.response.data.errorMessage);
      // res.redirect("/index");
      req.flash("messages", "Get UserInfo 실패");
      res.send("로그인 실패");
      // res.render("/", { messages: req.flash("messages") });
    });
});

router.get("/index", function (req, res, next) {
  console.log("Render /index");
  console.log(`Request to get user`);
  console.log(req.app.locals.user);
  res.render("index", { user: req.app.locals.user });
});

// router.get("/active", ensureLoggedIn, fetchTodos, function (req, res, next) {
//   res.locals.todos = res.locals.todos.filter(function (todo) {
//     return !todo.completed;
//   });
//   res.locals.filter = "active";
//   res.render("index", { user: req.user });
// });

router.get("/completed", ensureLoggedIn, fetchTodos, function (req, res, next) {
  res.locals.todos = res.locals.todos.filter(function (todo) {
    return todo.completed;
  });
  res.locals.filter = "completed";
  res.render("index", { user: req.user });
});

// router.post(
//   "/",
//   ensureLoggedIn,
//   function (req, res, next) {
//     req.body.title = req.body.title.trim();
//     next();
//   },
//   function (req, res, next) {
//     if (req.body.title !== "") {
//       return next();
//     }
//     return res.redirect("/" + (req.body.filter || ""));
//   },
//   function (req, res, next) {
//     db.run(
//       "INSERT INTO todos (owner_id, title, completed) VALUES (?, ?, ?)",
//       [req.user.id, req.body.title, req.body.completed == true ? 1 : null],
//       function (err) {
//         if (err) {
//           return next(err);
//         }
//         return res.redirect("/" + (req.body.filter || ""));
//       }
//     );
//   }
// );

// router.post(
//   "/:id(\\d+)",
//   ensureLoggedIn,
//   function (req, res, next) {
//     req.body.title = req.body.title.trim();
//     next();
//   },
//   function (req, res, next) {
//     if (req.body.title !== "") {
//       return next();
//     }
//     db.run(
//       "DELETE FROM todos WHERE id = ? AND owner_id = ?",
//       [req.params.id, req.user.id],
//       function (err) {
//         if (err) {
//           return next(err);
//         }
//         return res.redirect("/" + (req.body.filter || ""));
//       }
//     );
//   },
//   function (req, res, next) {
//     db.run(
//       "UPDATE todos SET title = ?, completed = ? WHERE id = ? AND owner_id = ?",
//       [
//         req.body.title,
//         req.body.completed !== undefined ? 1 : null,
//         req.params.id,
//         req.user.id,
//       ],
//       function (err) {
//         if (err) {
//           return next(err);
//         }
//         return res.redirect("/" + (req.body.filter || ""));
//       }
//     );
//   }
// );

// router.post("/:id(\\d+)/delete", ensureLoggedIn, function (req, res, next) {
//   db.run(
//     "DELETE FROM todos WHERE id = ? AND owner_id = ?",
//     [req.params.id, req.user.id],
//     function (err) {
//       if (err) {
//         return next(err);
//       }
//       return res.redirect("/" + (req.body.filter || ""));
//     }
//   );
// });

// router.post("/toggle-all", ensureLoggedIn, function (req, res, next) {
//   db.run(
//     "UPDATE todos SET completed = ? WHERE owner_id = ?",
//     [req.body.completed !== undefined ? 1 : null, req.user.id],
//     function (err) {
//       if (err) {
//         return next(err);
//       }
//       return res.redirect("/" + (req.body.filter || ""));
//     }
//   );
// });

// router.post("/clear-completed", ensureLoggedIn, function (req, res, next) {
//   db.run(
//     "DELETE FROM todos WHERE owner_id = ? AND completed = ?",
//     [req.user.id, 1],
//     function (err) {
//       if (err) {
//         return next(err);
//       }
//       return res.redirect("/" + (req.body.filter || ""));
//     }
//   );
// });

module.exports = router;
