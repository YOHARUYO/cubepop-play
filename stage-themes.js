/* Approved one-based display stage ranges. Unassigned stages keep sandstone. */
(function(root){
  const assignments=[
    {from:1,to:10,theme:'sandstone'},
    {from:11,to:20,theme:'coast'},
    {from:21,to:30,theme:'alps'},
    {from:31,to:40,theme:'royal'},
    {from:41,to:50,theme:'astral'}
  ];
  root.CubePopStageThemes=assignments;
  if(typeof module==='object')module.exports=assignments;
})(typeof window==='object'?window:globalThis);
