import Address from "../models/Address.js";

// Get all addresses for a user
export const getUserAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: 1 });
    res.status(200).json({ success: true, addresses });
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    res.status(500).json({ success: false, message: "Error fetching addresses." });
  }
};

// Create a new address
export const createAddress = async (req, res) => {
  const { label, address, lat, lng, accessNotes, isDefault, commune, region } = req.body;

  if (!label || !address || !lat || !lng) {
    return res.status(400).json({ success: false, message: "Label, address, lat, and lng are required." });
  }

  try {
    const newAddress = new Address({
      userId: req.user.id,
      label,
      address,
      lat,
      lng,
      accessNotes,
      isDefault: isDefault || false,
      commune,
      region
    });

    await newAddress.save();
    res.status(201).json({ success: true, message: "Address created successfully.", address: newAddress });
  } catch (error) {
    console.error("Error creating address:", error);
    res.status(500).json({ success: false, message: "Error creating address." });
  }
};

// Update an existing address
export const updateAddress = async (req, res) => {
  const { id } = req.params;
  const { label, address, lat, lng, accessNotes, isDefault, commune, region } = req.body;

  try {
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { label, address, lat, lng, accessNotes, isDefault, commune, region },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: "Address not found or not authorized." });
    }

    res.status(200).json({ success: true, message: "Address updated successfully.", address: updatedAddress });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ success: false, message: "Error updating address." });
  }
};

// Delete an address
export const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedAddress = await Address.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!deletedAddress) {
      return res.status(404).json({ success: false, message: "Address not found or not authorized." });
    }

    res.status(200).json({ success: true, message: "Address deleted successfully." });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ success: false, message: "Error deleting address." });
  }
};

// Set an address as default
export const setDefaultAddress = async (req, res) => {
  const { id } = req.params;

  try {
    // Unset default for all other addresses of the user
    await Address.updateMany({ userId: req.user.id }, { $set: { isDefault: false } });

    // Set the specified address as default
    const address = await Address.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: { isDefault: true } },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found or not authorized." });
    }

    res.status(200).json({ success: true, message: "Address set as default.", address });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ success: false, message: "Error setting default address." });
  }
};

