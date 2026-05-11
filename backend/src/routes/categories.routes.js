const express = require("express");

const { query } = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await query(
      "select id, name, slug from categories order by name asc"
    );

    res.json(result.rows);
  })
);

module.exports = router;
