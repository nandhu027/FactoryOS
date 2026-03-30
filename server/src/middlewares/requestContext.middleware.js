export const setRequestContext = (req, res, next) => {
  if (req.user && req.user.id) {
    req.dbUserId = req.user.id;
  } else {
    req.dbUserId = null;
  }
  next();
};
