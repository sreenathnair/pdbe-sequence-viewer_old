import * as d3 from "d3";
import DomainsAdapter from "./DomainsAdapter";
import FeaturesAdapter from "./FeaturesAdapter";
import QualityAdapter from "./QualityAdapter";
import QualitySummaryAdapter from "./QualitySummaryAdapter";

import Utils from "./Utils";


class PDBeSequenceViewer extends HTMLElement {

  constructor() {
    super();
    this._components = this.getAttribute("components");
    this._pdbid = this.getAttribute("pdbid");
    this._entityId = this.getAttribute("entityId");
    this._componentDataHash = {};
    this._utils = new Utils();

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

          var bestEntry = ratioResult[compObj._pdbid][compObj._entityId][0];
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
          apiList = compObj._utils.flattenArray(apiList);

          // making a unique list
          apiList = compObj._utils.uniqueArray(apiList);

          console.log(apiList);

          promiseList = dataService.createPromise([compObj._pdbid], apiList, compObj._bestChainId, compObj._bestStructAsymId);

          dataService.combineData(promiseList, compObj._pdbid, apiList).then(function (combinedResult) {

            console.log(combinedResult)

            // paint molecule component by default

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
                }], color: config["color_code"]["modified"]
              }
            ];

            // molecule component
            if (combinedResult[compObj._pdbid]['entities']['resolve']) {

              combinedResult[compObj._pdbid]['entities']['result'][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(element => {
                  
                  compObj._pdbSequence = element.sequence;
                  document.querySelector('#top-sequence').data = compObj._pdbSequence;

                  let fragment = {
                    start: compObj._displaystart,
                    end: compObj._displayend,
                    toolTip: "Residue {resNum} ({charAtResNum})<br>" +
                      "<b>" + compObj._pdbid + "</b>"
                  };

                  moleculeData[0].locations[0].fragments.push(fragment);

                });
            }

            // populating mutated residues
            if (combinedResult[compObj._pdbid]["mutatedResidues"]["resolve"]) {

              combinedResult[compObj._pdbid]["mutatedResidues"]["result"][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(mutatedElement => {

                  let tempFragment = {
                    start: mutatedElement.residue_number,
                    end: mutatedElement.residue_number,
                    toolTip: mutatedElement.mutation_details.from + " --> " + mutatedElement.mutation_details.to +
                      " (" + mutatedElement.mutation_details.type + ")"
                  }
                  moleculeData[1].locations[0].fragments.push(tempFragment);

                });
            }

            // populating modified residues
            if (combinedResult[compObj._pdbid]["modifiedResidues"]["resolve"]) {

              combinedResult[compObj._pdbid]["modifiedResidues"]["result"][compObj._pdbid]
                .filter(x => (x.entity_id && x.entity_id == compObj._entityId))
                .forEach(modifiedElement => {

                  let tempFragment = {
                    start: modifiedElement.residue_number,
                    end: modifiedElement.residue_number,
                    toolTip: "Modified Residue: " + modifiedElement.chem_comp_id
                  }
                  moleculeData[2].locations[0].fragments.push(tempFragment);

                });
            }

            compObj._componentDataHash["molecule"] = moleculeData;

            document.querySelector('#molecule-track').data = moleculeData;

            // painting components as per default configuration
            config["default_structure"].forEach(category => {
              //console.log(category)

              let categoryDiv = compObj.mainContent.append('div')
                .attr('id', category.id + "-div");

              categoryDiv.append('div')
                .attr('class', 'left category')
                .text(category.label)
                .on('click', function () {
                  compObj._utils.toggle($(this));
                });

              categoryDiv.append('protvista-track')
                .attr('id', category.id + "-summary-track")
                .attr('class', 'right')
                .attr('length', compObj._pdbSequenceLength)
                .attr('displaystart', compObj._displaystart)
                .attr('displayend', compObj._displayend);

              // paint sub components as applicable
              if (category.type === "multi") {

                let categoryTracksDiv = categoryDiv.append('div')
                  .attr('id', category.id + "-tracks")
                  .attr('style', 'display:none');

                category.contents.forEach(subcomponent => {

                  if (subcomponent.adapter != undefined) {

                    let respectiveClass = compObj._utils.createClassByName(subcomponent.adapter, subcomponent, compObj, config,
                      combinedResult[compObj._pdbid][subcomponent.resultMap]["result"][compObj._pdbid]);

                    let data = respectiveClass.getData();

                    // paint component if data is present
                    if (data[0] != undefined && data[0].present) {

                      // keep the data in hash for other components to use instead of making a new call
                      compObj._componentDataHash[subcomponent.id] = data;

                      categoryTracksDiv.append('div')
                        .attr('id', subcomponent.id)
                        .attr('class', 'left category-header')
                        .text(subcomponent.label);

                      categoryTracksDiv.append('protvista-track')
                        .attr('id', subcomponent.id + "-track")
                        .attr('class', 'right')
                        .attr('length', compObj._pdbSequenceLength)
                        .attr('displaystart', compObj._displaystart)
                        .attr('displayend', compObj._displayend);

                      document.querySelector("#" + subcomponent.id + "-track").data = data;


                    }
                  }
                });
              }

              // paint summary track as configured

              if (category.summary != undefined && category.summary.length != 0) {

                let summaryData = [];

                category.summary.forEach(element => {

                  compObj._componentDataHash[element] != undefined ? summaryData.push(compObj._componentDataHash[element][0]) : null; // data is added always to data[0]

                });

                document.querySelector("#" + category.id + "-summary-track").data = summaryData;

              } else if (category.adapter != undefined && category.adapter != "") {
                //console.log(category, " yes")

                let respectiveClass = compObj._utils.createClassByName(category.adapter, category, compObj, config);

                let summaryData = respectiveClass.getData();

                document.querySelector("#" + category.id + "-summary-track").data = summaryData;

              }

            });

            // painting bottom sequence component

            compObj.bottomSeqDiv = compObj.mainContent.append('div')
              .attr('id', 'bottom-seq-div');

            compObj.bottomSeqDiv.append('div')
              .attr('class', 'left');

            compObj.bottomSeqDiv.append('protvista-sequence')
              .attr('class', 'right')
              .attr('id', 'bottom-sequence')
              .attr('length', compObj._pdbSequenceLength)
              .attr('displaystart', compObj._displaystart)
              .attr('displayend', compObj._displayend);

            document.querySelector('#bottom-sequence').data = compObj._pdbSequence;

            /*d3.selectAll('protvista-track')
              .append('data-loader')
              .attr('data-key', 'config')
                .append('source')
                .attr('src', 'https://cdn.jsdelivr.net/npm/protvista-track/dist/config.json');*/


          },
            function (error) {
              console.log('Error loading API data');
              console.log(error);
              window.alert('Error downloading API data, please check the parameters');
            }
          );

        });


      });

      console.log("Component Data Hash", this._componentDataHash);

      // delaying to get the components painted after API calls
      setTimeout(this._utils.bindEvents, 4000);

    });
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
      .attr('class', 'left category')
      .text('Molecule');

    this.moleculeDiv.append('protvista-track')
      .attr('id', 'molecule-track')
      .attr('class', 'right')
      .attr('length', compObj._pdbSequenceLength)
      .attr('displaystart', compObj._displaystart)
      .attr('displayend', compObj._displayend);

  }

}

export default PDBeSequenceViewer;
