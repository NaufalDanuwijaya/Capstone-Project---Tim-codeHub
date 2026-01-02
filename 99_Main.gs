function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Keuangan UMKM')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}