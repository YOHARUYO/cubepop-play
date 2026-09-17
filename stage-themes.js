/* Approved one-based display stage ranges. Unassigned stages keep sandstone. */
(function(root){
  const assignments=[
    {from:1,to:10,theme:'sandstone'},
    {from:11,to:20,theme:'coast'}
  ];
  root.CubePopStageThemes=assignments;
  if(typeof module==='object')module.exports=assignments;
})(typeof window==='object'?window:globalThis);
