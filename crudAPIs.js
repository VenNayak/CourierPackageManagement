const db = require("./db");
var express = require('express');
var router = express.Router();

//API for branch office managers to create new Package Details
router.post('/branch/createPackageDetails', (req, res) => {
   console.log("Inside create Package API",req.body);
   let p = req.body; 
   //console.log("Address",p.sourceAddress);
   db.run("Insert into package_details(SourceAddress,DestinationAddress,Height,Weight,Width,Price,Status,ManagerId) values (?,?,?,?,?,?,?,?)",
              [p.sourceAddress,p.destinationAddress,p.height,p.weight,p.width,p.price,"Package Accepted",p.managerId],
                function (err){
                    if (err) {
                        res.status(400).json({ "error": err.message })
                        return;
                    }
                    console.log("response log ",this);
                    res.status(201).json({
                        "packageId":this.lastID
                    });
        });
});

//API for Head office manager to create shipping routes for the headoffice

router.post('/headoffice/createShippingRoutes', (req, res) => {
    console.log("Inside Create Shipping Routes API",req.body);
    let shipRoutes = req.body; 
    console.log("shipRoutes ",req.body);
    let flatRoutes=[];
    shipRoutes.forEach(function (obj,i) {
      //  flatRoutes.push(i+1); //route Id 
        Object.values(obj).forEach(val => {
            flatRoutes.push(val); //for remanining attribute values
          });  

      });
      
    console.log("shipRoutes with route Ids ",shipRoutes);
    let routesPlaceHolder = shipRoutes.map(() => "(?, ?, ?, ?)").join(', ');
    let sql = "Insert into Shipment_Routes(PackageId,fromBranch,toBranch,managerId) values " + routesPlaceHolder;
   
    console.log("sql ",sql);
    console.log("flatRoutes ", flatRoutes);
    db.serialize(function(){    
        db.run(sql, flatRoutes, function(err){
            if(err) throw err;
                console.log("response log ",this);
                  res.status(201).json({
                    "Rows_Created": this.changes
                });
        });
    }); 
    
 });
 
 
//API for In Transit Branch offices to update Transportation for shipping routes
router.post('/branch/createTransportationForRoute', (req, res) => {
    console.log("Inside Create Transportation for Shipping Route API",req.body);
   let p = req.body; 
   //console.log("Address",p.sourceAddress);
  db.serialize(function(){
        db.run("Insert into Transport_Details(RouteId,PackageId,TransportDate,ManagerId) values (?,?,?,?)",
                    [p.routeId,p.packageId,p.transportDate,p.managerId],
                        function (err){
                            if(err) {
                                res.status(400).json({ "error": err.message })
                                return;
                            }
                            console.log("response log ",this);
                let transportId = this.lastID;             
                db.run("Insert into Transport_Provider (TransportId,ProviderName,Mode) values (?,?,?)",
                    [transportId,p.providerName,p.mode],
                        function (err){
                            if(err){
                                res.status(400).json({ "error": err.message })
                                return;
                            }

                            db.run("Update Shipping_Route_Status set status =? where routeId = ?",
                            ["In Transit",p.routeId],                  
                              function(err){
                                  if(err){
                                      res.status(400).json({ "error": err.message })
                                      return;
                                  }
                                  res.status(201).json({
                                    "TransportId_Created": transportId
                                });
          
                              });

                });
                           
        });

    });    
    
 });

 // Update transportation for a route
 router.post('/branch/updateTransportationForRoute', (req, res) => {
    console.log("Inside Update Transportation for Shipping Route API",req.body);
   let p = req.body; 
   let setClause=[];
   let col=[];
   //[p.transportDate,p.receivedDate,p.routeId,p.packageId]
   if(p.transportDate){
        setClause.push("transportDate=?");
        col.push(p.transportDate);
   }
   if(p.receivedDate){
        setClause.push("receivedDate=?");
        col.push(p.receivedDate);
   }
   col.push(p.routeId);
   col.push(p.packageId);
   db.serialize(function(){
   db.run("Update Transport_Details set " + setClause.join(",") + " Where routeId =? and packageId=?",
              col,
                function (err){
                    if (err) {
                        res.status(400).json({ "error": err.message })
                        return;
                    }
                    console.log("response log ",this);
                let routeStatus = "In Transit";    
                if(p.receivedDate){
                    routeStatus = "Received" ;
                }
                db.run("Update Shipping_Route_Status set status =? where routeId = ?",
                  [routeStatus,p.routeId],                  
                    function(err){
                        if(err){
                            res.status(400).json({ "error": err.message })
                            return;
                        }
                        let lastChanged = this.changes; 
                        let packageStatus = "";
                        db.get("SELECT status FROM V_Package_Route_Status WHERE packageId=?",
                         [p.packageId],                  
                          function(err,row){
                            if(err){
                                res.status(400).json({ "error": err.message })
                                return;
                            }
                            console.log("Package_routing_status from DB ",row)
                            if(row.Status == "Created"){
                                packageStatus = "In Transit";
                            }
                            else if(row.Status == "Received"){
                                packageStatus = "Ready For Delivery";
                            }
                            else if(row.Status == "In Transit"){
                                packageStatus = "In Transit";
                            }

                            db.run("Update Package_Details set status =? where packageId = ?",
                            [packageStatus,p.packageId],                  
                              function(err){
                                if(err){
                                    res.status(400).json({ "error": err.message })
                                    return;
                                }
                                res.status(201).json({
                                    "Rows_Updated": lastChanged
                                });

                              });
                            
                          });

                    });

        });
    });
 });

 //API for Delivery Branch office to arrange Delivery for package
router.post('/branch/createDeliveryForPackage', (req, res) => {
    console.log("Inside Create Delivery API",req.body);
   let p = req.body; 
  db.serialize(function(){
        db.run("Insert into Delivery_Details(PackageId,ManagerId,ScheduledDate) values (?,?,?)",
                    [p.packageId,p.managerId,p.scheduledDate],
                        function (err){
                            if(err) {
                                res.status(400).json({ "error": err.message })
                                return;
                            }
                            console.log("response log ",this);
                let deliveryId = this.lastID;             
                db.run("Insert into Delivery_Provider (DeliveryId,PartnerName,VehicleNo) values (?,?,?)",
                    [deliveryId,p.partnerName,p.vehicleNo],
                        function (err){
                            if(err){
                                res.status(400).json({ "error": err.message })
                                return;
                            }
                            db.run("Update Package_Details set status =? where packageId = ?",
                            ["Out For Delivery",p.packageId],                  
                              function(err){
                                if(err){
                                    res.status(400).json({ "error": err.message })
                                    return;
                                }
                                res.status(201).json({
                                    "Delivery_ID_Created": deliveryId
                                });

                              });
 

                });
                           
        });

    });    
    
 });


// Update delivery for a package
router.post('/branch/updateDeliveryForPackage', (req, res) => {
    console.log("Inside Update Delivery for Package API",req.body);
   let p = req.body; 
   let setClause1=[];
   let col1=[];
   //[p.transportDate,p.receivedDate,p.routeId,p.packageId]
   if(p.scheduledDate){
        setClause1.push("scheduledDate=?");
        col1.push(p.scheduledDate);
   }
   if(p.deliveredDate){
        setClause1.push("deliveredDate=?");
        col1.push(p.deliveredDate);
   }
   col1.push(p.deliveryId);
   col1.push(p.packageId);
   let setClause2 =[];
   let col2 = [];
   if(p.partnerName){
        setClause2.push("partnerName=?");
        col2.push(p.partnerName);
   }
   if(p.vehicleNo){
        setClause2.push("vehicleNo=?");
        col2.push(p.vehicleNo);
   }
   col2.push(p.deliveryId);

   db.serialize(function(){
    if(setClause1.length >0){
        db.run("Update Delivery_Details set " + setClause1.join(",") + " where deliveryId = ? and packageId = ?",
                    col1,
                        function (err){
                            if(err) {
                                res.status(400).json({ "error": err.message })
                                return;
                            } 
                          if(p.deliveredDate){
                            db.run("Update Package_Details set status = ? where packageId = ?",
                            ["Package Delivered",p.packageId],
                                function (err){
                                    if(err) {
                                        res.status(400).json({ "error": err.message })
                                        return;
                                    }
                                }); 
                          }
                            if(setClause2.length ==0)      
                            res.status(201).json({"status":"success"});
                        
        });
        }
        if(setClause2.length>0){
        db.run("Update Delivery_Provider set " + setClause2.join(",") + " where deliveryId = ?",
            col2,
                function (err){
                    if(err) {
                        res.status(400).json({ "error": err.message })
                        return;
                    }        
                        res.status(201).json({"status":"success"});
                
            });
        }

    });
    
 });

//GET APIs 
// HO Office API to fetch Packages for which Route has to be created
router.post('/headoffice/getNewPackagesForRouteCreation', (req, res) => {
    let p = req.body;
    let clause ="";
    let params = [];
    params.push("Package Accepted");
    if(p.branchCode){
        clause =" and md.officeCode=?"
        params.push(p.branchCode);
    }

    db.all("SELECT pd.packageId,pd. SourceAddress,pd.DestinationAddress,md.OfficeCode as BranchCode from Package_Details pd"+ 
           " JOIN Manager_Details md ON md.managerId = pd.managerId WHERE status = ?" + clause,
            params, (err, rows) => {
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
                }
                console.log("Packages for Route Creation ",rows);
                res.status(200).json(rows);
            });

});



 // Branch Office API to fetch Routes for which Transportation needs to be created for a branch office
router.post('/branchoffice/getNewRoutesForTransport', (req, res) => {
    db.all("Select RouteId, PackageId,FromBranch,ToBranch FROM V_Get_New_Created_Routes WHERE FromBranch=?",
            [req.body.branchCode], (err, rows) => {  //from branch code
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
                }
                console.log("Packages for Transport Creation ",rows);
                res.status(200).json(rows);
            });

});

 // Branch Office API to fetch Packages ready for delivery for a branch
 router.post('/branchoffice/getPackagesForDelivery', (req, res) => {
    db.all("Select PackageId, SourceAddress,DestinationAddress,Height,Width,Weight,Price FROM V_Get_Packages_Ready_For_Delivery WHERE BranchCode=?",
            [req.body.branchCode], (err, rows) => {  //from branch code
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
                }
                console.log("Packages for Delivery From DB for Branch ",rows);
                res.status(200).json(rows);
            });

});

 // Global API to see status of Package
 router.post('/global/getPackageDeliveryStatus', (req, res) => {
    db.get("SELECT status, currentBranch, city currentCity,ol.Area as currentArea FROM V_Package_Shipment_Status vpss JOIN Office_Locations ol ON ol.OfficeCode = vpss.currentbranch WHERE packageId=?",
            [req.body.packageId], (err, row) => {  //from branch code
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
            }
                console.log("Package Status ",row);
                res.status(200).json(row);
            });

});


module.exports =router;