export const ok = (res, data = null, message = "Success", meta = {}) =>
  res.status(200).json({ success: true, message, data, ...meta });

export const created = (res, data = null, message = "Created", meta = {}) =>
  res.status(201).json({ success: true, message, data, ...meta });

export const noContent = (res) => res.status(204).send();
