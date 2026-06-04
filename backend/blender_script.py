import bpy
import sys
import os

def convert_3ds_to_glb(input_path, output_path):
    # 1. 기존 씬 초기화 (빈 상태로 시작)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # 2. 3DS 임포트 플러그인 확인 및 활성화
    # Blender 4.0+ 버전에서는 기본 포함되지 않을 수 있으므로 예외 처리 필요할 수 있음
    try:
        # 3DS 파일 임포트
        bpy.ops.import_scene.autodesk_3ds(filepath=input_path)
    except Exception as e:
        print(f"Error importing 3DS: {e}")
        sys.exit(1)

    # 3. 모든 객체 선택 (필요 시 수정 사항 적용)
    bpy.ops.object.select_all(action='SELECT')
    
    # 4. GLB 내보내기
    # export_format='GLB'로 지정
    try:
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_apply=True,  # 모디파이어 적용
            export_colors=True,
            export_materials='EXPORT',
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
            export_attributes=True,
            export_current_frame=False
        )
    except Exception as e:
        print(f"Error exporting GLB: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 명령어 인자 처리: blender -b -P script.py -- <input> <output>
    # '--' 이후의 인자들만 가져옴
    try:
        args = sys.argv[sys.argv.index("--") + 1:]
        if len(args) < 2:
            print("Usage: blender -b -P script.py -- <input_3ds> <output_glb>")
            sys.exit(1)
        
        input_3ds = args[0]
        output_glb = args[1]
        
        convert_3ds_to_glb(input_3ds, output_glb)
    except ValueError:
        print("Argument delimiter '--' not found")
        sys.exit(1)
