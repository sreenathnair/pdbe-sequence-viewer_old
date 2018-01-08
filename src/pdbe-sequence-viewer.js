import * as d3 from "d3";

class PDBeSequenceViewer extends HTMLElement {

  constructor() {
    super();
    this._components = this.getAttribute("components");
    this._pdbid = this.getAttribute("pdbid");


  }

  connectedCallback() {

    console.log('Loaded PDB sequence viewer');
    console.log("Required components => " + this._components);
    console.log("PDBID => " + this._pdbid);

    //reading configuration
    d3.json("pdbe-sequence-viewer/config/config.json", config => {

      console.log("Config => ", config);
      var dataService = new DataService();
      var compObj = this;

      // api to get outlier ratio to get best chain id
      var ratioPromiseList = dataService.createPromise([this._pdbid], ['observedResidueRatio']);

      ratioPromiseList.forEach(ratioPromise => {

        ratioPromise.then(function (ratioResult) {

          var bestEntry = ratioResult[compObj._pdbid][1][0];
          compObj._bestChainId = bestEntry.chain_id;
          compObj._bestStructAsymId = bestEntry.struct_asym_id;
          compObj._pdbSequenceLength = bestEntry.number_residues;
          compObj._displaystart = 1;
          compObj._displayend = compObj._pdbSequenceLength;

          compObj.paintBasicLayout(compObj);

          //console.log(config['component'])

          // creating list of promises required for requested components
          var promiseList = [];
          var apiList = [];
          var componentHash = {};

          compObj._components.split(',').forEach(component => {
            let tempList = config['service'][component];
            apiList.push(tempList);
            componentHash[component] = '';
          });

          // flattening promise list
          apiList = compObj.flattenArray(apiList);

          // making a unique list
          apiList = compObj.uniqueArray(apiList);

          console.log(apiList);

          promiseList = dataService.createPromise([compObj._pdbid], apiList, compObj._bestChainId, compObj._bestStructAsymId);

          dataService.combineData(promiseList, compObj._pdbid, apiList).then(function (combinedResult) {

            console.log(combinedResult)

            // paint molecule component by default
            if (combinedResult[compObj._pdbid]['entities']['resolve']) {
              combinedResult[compObj._pdbid]['entities']['result'][compObj._pdbid].forEach(element => {

                if (element.entity_id && element.entity_id == 1) {
                  compObj._pdbSequence = element.sequence;
                  document.querySelector('#top-sequence').data = compObj._pdbSequence;

                  let moleculeData = [
                    {
                      accession: "molecule", locations: [{
                        fragments: []
                      }], color: config["color_code"]["molecule"]
                    },
                    {
                      accession: "mutated", locations: [{
                        fragments: []
                      }], color: config["color_code"]["mutated"]
                    },
                    {
                      accession: "modified", locations: [{
                        fragments: []
                      }] , color: config["color_code"]["modified"]
                    }
                  ];

                  // populating molecule fragment
                  for(let incr = compObj._displaystart; incr <= compObj._displayend; incr++) {
                    var tempFragment = {
                      start: incr,
                      end: incr,
                      toolTip: "Residue " +incr +" (" +compObj._pdbSequence.charAt(incr) +") <br>" +
                        "<b>" +compObj._pdbid +"</b>"
                    }
                    moleculeData[0].locations[0].fragments.push(tempFragment);
                  }
                  
                  // populating mutated residue fragment
                  if(combinedResult[compObj._pdbid]["mutatedResidues"]["resolve"]) {
                    combinedResult[compObj._pdbid]["mutatedResidues"]["result"][compObj._pdbid].forEach(mutatedElement => {
                      
                      if(mutatedElement.entity_id && mutatedElement.entity_id == 1 && mutatedElement.chain_id == compObj._bestChainId) {
                        let tempFragment = {
                          start: mutatedElement.residue_number,
                          end: mutatedElement.residue_number,
                          toolTip: mutatedElement.mutation_details.from +" --> " +mutatedElement.mutation_details.to +
                            " (" +mutatedElement.mutation_details.type +")"
                        }
                        moleculeData[1].locations[0].fragments.push(tempFragment);
                      }

                    });
                  }

                  // populating modified residue fragment
                  if(combinedResult[compObj._pdbid]["modifiedResidues"]["resolve"]) {
                    combinedResult[compObj._pdbid]["modifiedResidues"]["result"][compObj._pdbid].forEach(modifiedElement => {
                      
                      if(modifiedElement.entity_id && modifiedElement.entity_id == 1 && modifiedElement.chain_id == compObj._bestChainId) {
                        let tempFragment = {
                          start: modifiedElement.residue_number,
                          end: modifiedElement.residue_number,
                          toolTip: "Modified Residue: " +modifiedElement.chem_comp_id
                        }
                        moleculeData[2].locations[0].fragments.push(tempFragment);
                      }

                    });
                  }

                  document.querySelector('#molecule-track').data = moleculeData;

                  // painting mapping components
                  
                  if(combinedResult[compObj._pdbid]["mappings"]["resolve"]) {

                    compObj.mappingsDiv = compObj.mainContent.append('div')
                      .attr('id', 'mappings-div');
                    
                    compObj.mappingsDiv.append('div')
                      .attr('class', 'left')
                      .text('Mappings');
                    
                    compObj.mappingsDiv.append('protvista-track')
                      .attr('id', 'mappings-summary-track')
                      .attr('class', 'right')
                      .attr('length', compObj._pdbSequenceLength)
                      .attr('displaystart', compObj._displaystart)
                      .attr('displayend', compObj._displayend);

                    document.querySelector('#mappings-summary-track').data = moleculeData;
                      
                    let mappingsTrack = compObj.mappingsDiv.append('div')
                      .attr('id', 'mappings-tracks');
                    
                    let mappingResults = combinedResult[compObj._pdbid]["mappings"]["result"][compObj._pdbid];
                    let mappingsToProcess = [];

                    Object.keys(mappingResults).forEach(key => {
                      componentHash[key.toLowerCase()] != undefined ? mappingsToProcess.push(key):null;
                    });

                    console.log(mappingsToProcess)

                    mappingsToProcess.forEach(mapping => {
                      
                      mappingsTrack.append('div')
                        .attr('class', 'left category-header')
                        .text(mapping);
                      
                      mappingsTrack.append('protvista-track')
                        .attr('class', 'right')
                        .attr('id', mapping +'-track')
                        .attr('length', compObj._pdbSequenceLength)
                        .attr('displaystart', compObj._displaystart)
                        .attr('displayend', compObj._displayend);

                      let mappingData = [
                        {
                          accession: mapping, locations: [{
                            fragments: []
                          }], color: config["color_code"][mapping.toLowerCase()]
                        }];
                      

                      Object.keys(mappingResults[mapping]).forEach(result => {

                        mappingResults[mapping][result]['mappings'].forEach(elementMapping => {
                          

                          for(let incr = elementMapping.start.residue_number; incr <= elementMapping.end.residue_number; incr++) {

                            let uniprotTooltip = "";
                            // add UniProt details to tool tip if applicable
                            if(mapping === 'UniProt') {
                              uniprotTooltip = "UniProt range: " +elementMapping.unp_start +" - " +elementMapping.unp_end +"<br>";
                            }

                            let fragment = {
                              start: incr,
                              end: incr,
                              toolTip: "Residue " +incr +" (" +compObj._pdbSequence.charAt(incr) +")" +
                                "<br><b>" +result +"</b><br>" +
                                mappingResults[mapping][result].identifier +"<br>" +
                                uniprotTooltip +
                                "PDB range: " +elementMapping.start.residue_number +" - " +
                                elementMapping.end.residue_number +" (Chain " +compObj._bestChainId +")"
                            }
                            
                            mappingData[0].locations[0].fragments.push(fragment);
                          }
                        });
                      });

                      document.querySelector("#" +mapping +"-track").data = mappingData;

                    });

                  }

                }

              });
            }

          });

        },
          function (error) {
            console.log('Error loading API data');
            console.log(error);
            window.alert('Error downloading API data, please check the parameters');
          }
        );
      });

    });


    // delaying to get the components painted after API calls
    setTimeout(this.bindEvents, 2000);

  }


  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {

  }

  paintBasicLayout(compObj) {

    this.mainContent = d3.select(this)
      .append('div')
      .attr('class', 'main-content');

    this.navDiv = this.mainContent.append('div')
      .attr('id', 'nav-div');

    this.navDiv.append('div')
      .attr('class', 'left');

    this.navComponent = d3.select(document.createElement('protvista-navigation'));
    this.navComponent.attr('class', 'right')
      .attr('length', compObj._pdbSequenceLength)
      .attr('displaystart', compObj._displaystart)
      .attr('displayend', compObj._displayend)
      .attr('highlightstart', '')
      .attr('highlightend', '');

    this.navDiv.node().append(this.navComponent.node());


    this.topSeqDiv = this.mainContent.append('div')
      .attr('id', 'top-seq-div');

    this.topSeqDiv.append('div')
      .attr('class', 'left');

    this.topSeqDiv.append('protvista-sequence')
      .attr('class', 'right')
      .attr('id', 'top-sequence')
      .attr('length', compObj._pdbSequenceLength)
      .attr('displaystart', compObj._displaystart)
      .attr('displayend', compObj._displayend);

    this.moleculeDiv = this.mainContent.append('div')
      .attr('id', 'molecule-div');

    this.moleculeDiv.append('div')
      .attr('class', 'left')
      .text('Molecule');

    this.moleculeDiv.append('protvista-track')
      .attr('id', 'molecule-track')
      .attr('class', 'right')
      .attr('length', compObj._pdbSequenceLength)
      .attr('displaystart', compObj._displaystart)
      .attr('displayend', compObj._displayend);

  }

  uniqueArray(arrArg) {
    return arrArg.filter((elem, pos, arr) => {
      return arr.indexOf(elem) == pos;
    });
  }

  flattenArray(arrArg) {
    return arrArg.reduce((a, b) => a.concat(b));
  }

  // this function binds change events to all protvista components
  bindEvents() {
    let regEx = /^protvista/i;
    var viewerComponents = Array.prototype.slice.call(document.querySelectorAll('*')).filter(function (el) {
      return el.tagName.match(regEx);
    });

    viewerComponents.forEach(element => {

      element.addEventListener("change", e => {

        for (const ch of viewerComponents) {
          ch.setAttribute(e.detail.type, e.detail.value);
        }

        for (let key in e.detail) {

          for (const ch of viewerComponents) {
            ch.setAttribute(key, e.detail[key]);
          }

        }
      });
    });
  }

}

export default PDBeSequenceViewer;
