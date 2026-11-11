import React from 'react'
import {useState} from 'react'

import {
    AiFillFilePdf,
    AiFillFileExcel,
    AiFillFileWord,
    AiFillFilePpt,
    AiFillFileText,
    AiFillFileImage,
    AiFillFileZip,
    AiFillFile,
    AiFillFolder,

} from 'react-icons/ai'


export const DocumentCard = ({ name, author, type = 'default', size, onClick, onContextMenu, isChecked, onCheck, checkVisible }) => {



  const iconMap = {
        pdf: <AiFillFilePdf className="text-[#ed1c22] text-xl min-w-[24px]" />,
        excel: <AiFillFileExcel className="text-green-500 text-xl min-w-[24px]" />,
        word: <AiFillFileWord className="text-blue-500 text-xl min-w-[24px]" />,
        ppt: <AiFillFilePpt className="text-orange-500 text-xl min-w-[24px]" />,
        text: <AiFillFileText className="text-[#fb544a] text-xl min-w-[24px]" />,
        img: <AiFillFileImage className="text-[#fea190] text-xl min-w-[24px]" />,
        zip: <AiFillFileZip className="text-[#f8bd3a] text-xl min-w-[24px]" />,
        carpeta: <AiFillFolder className="text-[#ffd04c] text-xl min-w-[24px]"/>,
        default: <AiFillFile className="text-gray-400 text-xl min-w-[24px]" />,
    };




    const icon = iconMap[type.toLowerCase()] || iconMap.default;

    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg shadow bg-[#5445ff] hover:bg-[#3f35cc] cursor-pointer transition-all w-full max-w-full"
      >
	      {/*Checkbox para seleccionar archivo a mover*/}
        {checkVisible && (
        <input
	    	  type="checkbox"
      		checked={isChecked}
	      	onChange={onCheck}
  	    />
        )}

        <div
	    	  className="flex min-w-0 flex-1 w-full"
  	    	onClick={onClick}
	      	onContextMenu={onContextMenu}>

	      {/* Icono de documento */}
            {icon}

            {/* Info del documento */}
            <div className="flex flex-col sm:flex-row w-full sm:gap-4 gap-1 sm:items-center min-w-0 flex-1">
                {/* Nombre con truncado */}
                <div className="text-xs font-medium text-white truncate min-w-0 flex-1 sm:w-1/3">
                    {name}
                </div>

                {/* Autor (alineado + movido ligeramente a la derecha) */}

                {type !== 'carpeta' && (
                    <div className="text-xs text-gray-200 truncate min-w-0 hidden sm:block sm:w-1/3 sm:pl-2">
                      Autor: {author}
                    </div>
                )}

                {/* Tamaño */}
                <div className="text-xs text-gray-200 truncate min-w-0 sm:w-1/3 sm:text-right">
                    {size}
                </div>
            </div>
	      </div>
      </div>
    );





}

export default DocumentCard
