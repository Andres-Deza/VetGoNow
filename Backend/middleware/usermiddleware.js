const usermiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'User') {
      return res.status(403).json({ message: "Access denied. User only." });
  }
  next(); // Proceed to the next middleware/route handler if role is 'Vet'
};

export default usermiddleware;
